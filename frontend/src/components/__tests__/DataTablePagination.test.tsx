import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTablePagination } from '../ui/DataTablePagination';

const defaultProps = {
  totalItems: 100,
  pageSize: 10,
  currentPage: 1,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

describe('DataTablePagination', () => {
  it('renders total item count', () => {
    render(<DataTablePagination {...defaultProps} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows current page number', () => {
    render(<DataTablePagination {...defaultProps} currentPage={3} />);
    // The active page badge and the jump-to input both show the page number
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('shows total pages in "of N" text', () => {
    render(<DataTablePagination {...defaultProps} totalItems={50} pageSize={10} />);
    expect(screen.getByText('of 5')).toBeInTheDocument();
  });

  it('disables first/prev buttons on page 1', () => {
    render(<DataTablePagination {...defaultProps} currentPage={1} />);
    const [first, prev] = screen.getAllByRole('button').slice(0, 2);
    expect(first).toBeDisabled();
    expect(prev).toBeDisabled();
  });

  it('disables next/last buttons on last page', () => {
    render(<DataTablePagination {...defaultProps} totalItems={20} pageSize={10} currentPage={2} />);
    const buttons = screen.getAllByRole('button');
    const next = buttons[buttons.length - 2];
    const last = buttons[buttons.length - 1];
    expect(next).toBeDisabled();
    expect(last).toBeDisabled();
  });

  it('calls onPageChange(1) when first-page button clicked', () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTitle('First Page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange(currentPage - 1) when prev clicked', () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} currentPage={4} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTitle('Previous Page'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange(currentPage + 1) when next clicked', () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTitle('Next Page'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange(totalPages) when last-page button clicked', () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} totalItems={50} pageSize={10} currentPage={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByTitle('Last Page'));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('calls onPageSizeChange when page size select changes', () => {
    const onPageSizeChange = vi.fn();
    render(<DataTablePagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '25' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('clamps jump-to-page input below 1 to page 1', () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.change(screen.getByLabelText('Jump to'), { target: { value: '0' } });
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('clamps jump-to-page input above totalPages to totalPages', () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination {...defaultProps} totalItems={30} pageSize={10} onPageChange={onPageChange} />);
    fireEvent.change(screen.getByLabelText('Jump to'), { target: { value: '99' } });
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('treats 0 totalItems as 1 total page', () => {
    render(<DataTablePagination {...defaultProps} totalItems={0} />);
    expect(screen.getByText('of 1')).toBeInTheDocument();
  });
});
