/// Service Level Objectives (SLOs) for Stellar Insights API
///
/// Targets:
///   - p95 response time  < 500 ms
///   - Availability       >= 99.9 %
///   - Error rate         < 1 %
///
/// `SloEvaluator::evaluate()` reads existing Prometheus metrics and writes
/// two gauge vectors: `slo_compliance` (1=met, 0=breached) and
/// `slo_current_value` (raw measured value).
///
/// Call `spawn_slo_evaluator()` once at startup to run evaluation every 60 s.
use std::time::Duration;

use lazy_static::lazy_static;
use prometheus::{register_gauge_vec, GaugeVec};

use crate::observability::metrics::{
    ERRORS_TOTAL, HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL, REGISTRY,
};

// ── SLO targets ───────────────────────────────────────────────────────────────

/// p95 latency budget in seconds.
pub const SLO_P95_LATENCY_S: f64 = 0.500;

/// Minimum availability ratio (successful / total).
pub const SLO_AVAILABILITY: f64 = 0.999;

/// Maximum error ratio (5xx / total).
pub const SLO_MAX_ERROR_RATE: f64 = 0.010;

/// How often the evaluator re-checks compliance.
pub const EVAL_INTERVAL: Duration = Duration::from_secs(60);

// ── Prometheus gauges ─────────────────────────────────────────────────────────

lazy_static! {
    /// 1 = SLO met, 0 = SLO breached.
    /// Labels: slo = "p95_latency" | "availability" | "error_rate"
    pub static ref SLO_COMPLIANCE: GaugeVec = register_gauge_vec!(
        "slo_compliance",
        "1 if the SLO is currently met, 0 if breached",
        &["slo"],
        &REGISTRY
    )
    .expect("slo_compliance gauge registration failed");

    /// Current measured value for each SLO.
    /// Labels: slo = "p95_latency_seconds" | "availability_ratio" | "error_rate_ratio"
    pub static ref SLO_CURRENT_VALUE: GaugeVec = register_gauge_vec!(
        "slo_current_value",
        "Current measured value for each SLO metric",
        &["slo"],
        &REGISTRY
    )
    .expect("slo_current_value gauge registration failed");
}

/// Force-initialize the lazy_statics.
pub fn init_slo_metrics() {
    let _ = &*SLO_COMPLIANCE;
    let _ = &*SLO_CURRENT_VALUE;
}

// ── SLO evaluator ─────────────────────────────────────────────────────────────

pub struct SloEvaluator;

impl SloEvaluator {
    pub fn new() -> Self {
        Self
    }

    /// Evaluate all three SLOs and update the Prometheus gauges.
    pub fn evaluate(&self) {
        self.eval_p95_latency();
        self.eval_availability();
        self.eval_error_rate();
    }

    fn eval_p95_latency(&self) {
        let families = REGISTRY.gather();
        let p95 = families
            .iter()
            .find(|f| f.get_name() == "http_request_duration_seconds")
            .and_then(|f| f.get_metric().first())
            .map(estimate_p95_from_histogram)
            .unwrap_or(0.0);

        let met = p95 <= SLO_P95_LATENCY_S;
        SLO_COMPLIANCE
            .with_label_values(&["p95_latency"])
            .set(if met { 1.0 } else { 0.0 });
        SLO_CURRENT_VALUE
            .with_label_values(&["p95_latency_seconds"])
            .set(p95);

        if !met {
            tracing::warn!(
                slo = "p95_latency",
                current_s = p95,
                target_s = SLO_P95_LATENCY_S,
                "SLO BREACHED: p95 latency exceeds target"
            );
        }
    }

    fn eval_availability(&self) {
        let total = HTTP_REQUESTS_TOTAL.get();
        let errors = ERRORS_TOTAL.get();

        if total == 0.0 {
            SLO_COMPLIANCE.with_label_values(&["availability"]).set(1.0);
            SLO_CURRENT_VALUE
                .with_label_values(&["availability_ratio"])
                .set(1.0);
            return;
        }

        let availability = (total - errors) / total;
        let met = availability >= SLO_AVAILABILITY;

        SLO_COMPLIANCE
            .with_label_values(&["availability"])
            .set(if met { 1.0 } else { 0.0 });
        SLO_CURRENT_VALUE
            .with_label_values(&["availability_ratio"])
            .set(availability);

        if !met {
            tracing::warn!(
                slo = "availability",
                current = availability,
                target = SLO_AVAILABILITY,
                "SLO BREACHED: availability below target"
            );
        }
    }

    fn eval_error_rate(&self) {
        let total = HTTP_REQUESTS_TOTAL.get();
        let errors = ERRORS_TOTAL.get();

        if total == 0.0 {
            SLO_COMPLIANCE.with_label_values(&["error_rate"]).set(1.0);
            SLO_CURRENT_VALUE
                .with_label_values(&["error_rate_ratio"])
                .set(0.0);
            return;
        }

        let error_rate = errors / total;
        let met = error_rate < SLO_MAX_ERROR_RATE;

        SLO_COMPLIANCE
            .with_label_values(&["error_rate"])
            .set(if met { 1.0 } else { 0.0 });
        SLO_CURRENT_VALUE
            .with_label_values(&["error_rate_ratio"])
            .set(error_rate);

        if !met {
            tracing::warn!(
                slo = "error_rate",
                current = error_rate,
                target = SLO_MAX_ERROR_RATE,
                "SLO BREACHED: error rate exceeds target"
            );
        }
    }
}

impl Default for SloEvaluator {
    fn default() -> Self {
        Self::new()
    }
}

/// Spawn a background Tokio task that evaluates SLOs on a fixed interval.
pub fn spawn_slo_evaluator() {
    tokio::spawn(async move {
        init_slo_metrics();
        let evaluator = SloEvaluator::new();
        let mut interval = tokio::time::interval(EVAL_INTERVAL);
        loop {
            interval.tick().await;
            evaluator.evaluate();
            tracing::debug!("SLO evaluation complete");
        }
    });
}

// ── p95 estimation from Prometheus histogram proto ────────────────────────────

fn estimate_p95_from_histogram(metric: &prometheus::proto::Metric) -> f64 {
    let histogram = metric.get_histogram();
    let total_count = histogram.get_sample_count();
    if total_count == 0 {
        return 0.0;
    }

    let target = total_count as f64 * 0.95;
    let buckets = histogram.get_bucket();
    let mut prev_count = 0u64;
    let mut prev_upper = 0.0f64;

    for bucket in buckets {
        let upper = bucket.get_upper_bound();
        let count = bucket.get_cumulative_count();

        if count as f64 >= target {
            let bucket_count = (count - prev_count) as f64;
            if bucket_count == 0.0 {
                return upper;
            }
            let fraction = (target - prev_count as f64) / bucket_count;
            return prev_upper + fraction * (upper - prev_upper);
        }

        prev_count = count;
        prev_upper = upper;
    }

    prev_upper
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::observability::metrics::init_metrics;

    fn setup() -> SloEvaluator {
        init_metrics();
        init_slo_metrics();
        SloEvaluator::new()
    }

    #[test]
    fn slo_constants_are_sensible() {
        assert!(SLO_P95_LATENCY_S > 0.0 && SLO_P95_LATENCY_S <= 1.0);
        assert!(SLO_AVAILABILITY > 0.99 && SLO_AVAILABILITY <= 1.0);
        assert!(SLO_MAX_ERROR_RATE > 0.0 && SLO_MAX_ERROR_RATE < 0.05);
        assert!(EVAL_INTERVAL.as_secs() > 0);
    }

    #[test]
    fn all_slos_met_when_no_requests() {
        let ev = setup();
        ev.evaluate();

        assert_eq!(
            SLO_COMPLIANCE.with_label_values(&["availability"]).get(),
            1.0
        );
        assert_eq!(
            SLO_COMPLIANCE.with_label_values(&["error_rate"]).get(),
            1.0
        );
        assert_eq!(
            SLO_COMPLIANCE.with_label_values(&["p95_latency"]).get(),
            1.0
        );
    }

    #[test]
    fn current_values_initialised_when_no_requests() {
        let ev = setup();
        ev.evaluate();

        assert_eq!(
            SLO_CURRENT_VALUE
                .with_label_values(&["availability_ratio"])
                .get(),
            1.0
        );
        assert_eq!(
            SLO_CURRENT_VALUE
                .with_label_values(&["error_rate_ratio"])
                .get(),
            0.0
        );
    }

    #[test]
    fn evaluate_does_not_panic_on_repeated_calls() {
        let ev = setup();
        for _ in 0..5 {
            ev.evaluate();
        }
    }

    #[test]
    fn p95_latency_slo_met_when_histogram_empty() {
        let ev = setup();
        ev.evaluate();
        assert_eq!(
            SLO_COMPLIANCE.with_label_values(&["p95_latency"]).get(),
            1.0
        );
    }
}
