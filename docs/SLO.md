# Stellar Insights — Service Level Objectives (SLOs)

This document defines the Service Level Objectives for the Stellar Insights API backend.

---

## SLO Definitions

| SLO | Metric | Target | Window |
|-----|--------|--------|--------|
| **Response Time** | p95 HTTP response latency | < 500 ms | Rolling (Prometheus histogram) |
| **Availability** | Successful responses / total requests | ≥ 99.9 % | Cumulative since last restart |
| **Error Rate** | 5xx responses / total requests | < 1 % | Cumulative since last restart |

---

## Key Endpoints & Latency Budgets

| Endpoint | p95 Target | Notes |
|----------|-----------|-------|
| `GET /api/corridors` | < 300 ms | Cached; cache miss ≤ 500 ms |
| `GET /api/corridors/:key` | < 300 ms | Cached |
| `GET /api/anchors` | < 300 ms | Cached |
| `GET /api/anchors/:id` | < 400 ms | DB read |
| `GET /api/prices` | < 400 ms | CoinGecko cache hit |
| `POST /api/cost-calculator/estimate` | < 500 ms | Compute-heavy |
| `GET /health` | < 50 ms | Always fast |
| `GET /metrics` | < 100 ms | Prometheus scrape |

---

## How SLOs Are Measured

SLO compliance is evaluated every **60 seconds** by `SloEvaluator` in
`backend/src/observability/slo.rs`. It reads the existing Prometheus metrics and
writes two gauge vectors exposed at `GET /metrics`.

### `slo_compliance{slo="..."}`
- `1` = SLO currently **met**
- `0` = SLO currently **breached**

Labels: `p95_latency` | `availability` | `error_rate`

### `slo_current_value{slo="..."}`
Current measured value for dashboards and alerting.

Labels: `p95_latency_seconds` | `availability_ratio` | `error_rate_ratio`

---

## Prometheus Queries

```promql
# SLO compliance (1 = met, 0 = breached)
slo_compliance{slo="p95_latency"}
slo_compliance{slo="availability"}
slo_compliance{slo="error_rate"}

# Current measured values
slo_current_value{slo="p95_latency_seconds"}
slo_current_value{slo="availability_ratio"}
slo_current_value{slo="error_rate_ratio"}

# p95 latency from raw histogram
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate from raw counters
rate(errors_total[5m]) / rate(http_requests_total[5m])
```

---

## Alerting Rules (Prometheus / Alertmanager)

```yaml
groups:
  - name: stellar_insights_slos
    rules:
      - alert: P95LatencySLOBreached
        expr: slo_compliance{slo="p95_latency"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency SLO breached (target < 500ms)"

      - alert: AvailabilitySLOBreached
        expr: slo_compliance{slo="availability"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Availability SLO breached (target >= 99.9%)"

      - alert: ErrorRateSLOBreached
        expr: slo_compliance{slo="error_rate"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error rate SLO breached (target < 1%)"
```

---

## Error Budget (30-day window)

| Window | Error Budget |
|--------|-------------|
| 30 days | 43.2 minutes |
| 7 days | 10.1 minutes |
| 24 hours | 1.44 minutes |

---

## SLO Constants in Code

Defined in `backend/src/observability/slo.rs`:

```rust
pub const SLO_P95_LATENCY_S:  f64      = 0.500;  // 500 ms
pub const SLO_AVAILABILITY:   f64      = 0.999;  // 99.9 %
pub const SLO_MAX_ERROR_RATE: f64      = 0.010;  // 1 %
pub const EVAL_INTERVAL:      Duration = Duration::from_secs(60);
```

---

## Enabling SLO Monitoring

Call `spawn_slo_evaluator()` at startup alongside `init_metrics()`:

```rust
stellar_insights_backend::observability::metrics::init_metrics();
stellar_insights_backend::observability::slo::spawn_slo_evaluator();
```

SLO metrics are then available at `GET /metrics` alongside all other Prometheus metrics.

---

## Grafana Dashboard

Import `docs/grafana/observability-dashboard.json` and add these panels:

| Panel | Query | Alert Threshold |
|-------|-------|----------------|
| p95 Latency | `slo_current_value{slo="p95_latency_seconds"}` | Red > 0.5 |
| Availability | `slo_current_value{slo="availability_ratio"}` | Red < 0.999 |
| Error Rate | `slo_current_value{slo="error_rate_ratio"}` | Red > 0.01 |
| SLO Compliance | `slo_compliance` | Alert when 0 |
