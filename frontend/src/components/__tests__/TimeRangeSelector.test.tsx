import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangeSelector } from '../ui/TimeRangeSelector';

describe('TimeRangeSelector', () => {
  it('renders all preset buttons', () => {
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '24h' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
  });

  it('calls onChange with a date range when 24h preset is clicked', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '24h' }));
    expect(onChange).toHaveBeenCalledOnce();
    const [start, end] = onChange.mock.calls[0];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
  });

  it('calls onChange with a date range when 7d preset is clicked', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    const [start] = onChange.mock.calls[0];
    const diffDays = (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
  });

  it('calls onChange with a date range when 30d preset is clicked', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    const [start] = onChange.mock.calls[0];
    const diffDays = (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('shows custom date inputs when Custom preset is clicked', () => {
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('does not show custom date inputs for non-custom presets', () => {
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={vi.fn()} />);
    // default preset is 30d
    expect(screen.queryByLabelText('Start Date')).not.toBeInTheDocument();
  });

  it('calls onChange when start date input changes', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-01' } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it('calls onChange when end date input changes', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector startDate={null} endDate={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-31' } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][1]).toBeInstanceOf(Date);
  });

  it('calls onChange with null when date input is cleared', () => {
    const onChange = vi.fn();
    const start = new Date('2024-01-01');
    render(<TimeRangeSelector startDate={start} endDate={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '' } });
    expect(onChange.mock.calls[0][0]).toBeNull();
  });
});
