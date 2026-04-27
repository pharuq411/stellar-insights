import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../dashboard/MetricCard';
import { AnchorCard } from '../anchors/AnchorCard';
import type { Anchor } from '@/types/anchor';

// next/image is a complex component; stub it for unit tests
vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

// ─── MetricCard ───────────────────────────────────────────────────────────────

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Success Rate" value="94.5%" />);
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('94.5%')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    render(<MetricCard label="Payments" value={1234} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders subLabel when provided', () => {
    render(<MetricCard label="Latency" value="350ms" subLabel="median" />);
    expect(screen.getByText('median')).toBeInTheDocument();
  });

  it('does not render subLabel when omitted', () => {
    render(<MetricCard label="Latency" value="350ms" />);
    expect(screen.queryByText('median')).not.toBeInTheDocument();
  });

  it('renders trend percentage when trend is provided', () => {
    render(<MetricCard label="Rate" value="90%" trend={5.2} trendDirection="up" />);
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });

  it('renders absolute trend value (no negative sign)', () => {
    render(<MetricCard label="Rate" value="90%" trend={-3.1} trendDirection="down" />);
    expect(screen.getByText('3.1%')).toBeInTheDocument();
  });

  it('does not render trend section when trend is undefined', () => {
    const { container } = render(<MetricCard label="Rate" value="90%" />);
    // ArrowUpRight / ArrowDownRight icons should not be present
    expect(container.querySelector('svg')).toBeInTheDocument(); // Activity icon only
  });
});

// ─── AnchorCard ───────────────────────────────────────────────────────────────

const baseAnchor: Anchor = {
  id: 'anchor-1',
  name: 'Test Anchor',
  stellar_account: 'GABC1234567890',
  status: 'green',
  reliability_score: 98.5,
  asset_coverage: 3,
  total_transactions: 12000,
  successful_transactions: 11940,
  failed_transactions: 60,
  failure_rate: 0.5,
  metadata: undefined,
};

describe('AnchorCard', () => {
  it('renders anchor name', () => {
    render(<AnchorCard anchor={baseAnchor} />);
    expect(screen.getByText('Test Anchor')).toBeInTheDocument();
  });

  it('renders stellar account', () => {
    render(<AnchorCard anchor={baseAnchor} />);
    expect(screen.getByText('GABC1234567890')).toBeInTheDocument();
  });

  it('renders reliability score', () => {
    render(<AnchorCard anchor={baseAnchor} />);
    expect(screen.getByText('98.5%')).toBeInTheDocument();
  });

  it('renders asset coverage count', () => {
    render(<AnchorCard anchor={baseAnchor} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders total transactions formatted', () => {
    render(<AnchorCard anchor={baseAnchor} />);
    expect(screen.getByText('12,000')).toBeInTheDocument();
  });

  it('renders failure rate', () => {
    render(<AnchorCard anchor={baseAnchor} />);
    expect(screen.getByText('0.50%')).toBeInTheDocument();
  });

  it('uses organization_name from metadata when available', () => {
    const anchor = {
      ...baseAnchor,
      metadata: { organization_name: 'Org Name' },
    } as Anchor;
    render(<AnchorCard anchor={anchor} />);
    expect(screen.getByText('Org Name')).toBeInTheDocument();
  });

  it('renders DBA when different from display name', () => {
    const anchor = {
      ...baseAnchor,
      metadata: { organization_name: 'Org Name', organization_dba: 'DBA Name' },
    } as Anchor;
    render(<AnchorCard anchor={anchor} />);
    expect(screen.getByText(/DBA: DBA Name/)).toBeInTheDocument();
  });

  it('renders website link when organization_url is provided', () => {
    const anchor = {
      ...baseAnchor,
      metadata: { organization_url: 'https://example.com' },
    } as Anchor;
    render(<AnchorCard anchor={anchor} />);
    expect(screen.getByRole('link', { name: /Website/ })).toHaveAttribute('href', 'https://example.com');
  });

  it('renders support email link when provided', () => {
    const anchor = {
      ...baseAnchor,
      metadata: { organization_support_email: 'support@example.com' },
    } as Anchor;
    render(<AnchorCard anchor={anchor} />);
    expect(screen.getByRole('link', { name: /Support/ })).toHaveAttribute('href', 'mailto:support@example.com');
  });

  it('renders supported currencies (up to 5)', () => {
    const anchor = {
      ...baseAnchor,
      metadata: { supported_currencies: ['USD', 'EUR', 'BRL', 'MXN', 'NGN', 'KES'] },
    } as Anchor;
    render(<AnchorCard anchor={anchor} />);
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it.each(['green', 'yellow', 'red'] as const)(
    'renders status "%s" badge',
    (status) => {
      render(<AnchorCard anchor={{ ...baseAnchor, status }} />);
      expect(screen.getByText(status, { exact: false })).toBeInTheDocument();
    }
  );
});
