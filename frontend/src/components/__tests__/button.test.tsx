import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Stub missing peer deps that button.tsx imports
vi.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
    <span {...props}>{children}</span>,
}));
vi.mock('class-variance-authority', () => ({
  cva: (_base: string, _config: unknown) => (..._args: unknown[]) => 'btn-class',
}));
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

import { Button } from '../ui/button';

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it.each(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const)(
    'renders variant "%s" without crashing',
    (variant) => {
      const { container } = render(<Button variant={variant}>Label</Button>);
      expect(container.firstChild).toBeInTheDocument();
    }
  );

  it.each(['default', 'sm', 'lg', 'icon'] as const)(
    'renders size "%s" without crashing',
    (size) => {
      const { container } = render(<Button size={size}>S</Button>);
      expect(container.firstChild).toBeInTheDocument();
    }
  );

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies extra className', () => {
    const { container } = render(<Button className="extra-class">X</Button>);
    expect(container.firstChild).toHaveClass('extra-class');
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    expect(screen.getByRole('link', { name: 'Link Button' })).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).not.toBeNull();
  });
});
