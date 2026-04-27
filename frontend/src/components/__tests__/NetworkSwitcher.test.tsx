import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkSwitcher } from '../NetworkSwitcher';

const mainnet = {
  network: 'mainnet',
  display_name: 'Mainnet',
  rpc_url: 'https://rpc.mainnet',
  horizon_url: 'https://horizon.mainnet',
  network_passphrase: 'Public Global Stellar Network ; September 2015',
  color: '#22c55e',
  is_mainnet: true,
  is_testnet: false,
};

const testnet = {
  network: 'testnet',
  display_name: 'Testnet',
  rpc_url: 'https://rpc.testnet',
  horizon_url: 'https://horizon.testnet',
  network_passphrase: 'Test SDF Network ; September 2015',
  color: '#f59e0b',
  is_mainnet: false,
  is_testnet: true,
};

const mockFetch = (responses: Record<string, unknown>) => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const key = Object.keys(responses).find((k) => url.includes(k));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(key ? responses[key] : {}),
    });
  }));
};

beforeEach(() => vi.stubGlobal('alert', vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe('NetworkSwitcher', () => {
  it('shows loading state initially', () => {
    mockFetch({ 'network/info': mainnet, 'network/available': [mainnet, testnet] });
    render(<NetworkSwitcher />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders current network name after load', async () => {
    mockFetch({ 'network/info': mainnet, 'network/available': [mainnet, testnet] });
    render(<NetworkSwitcher />);
    await waitFor(() => expect(screen.getByText('Mainnet')).toBeInTheDocument());
  });

  it('shows error state when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))));
    render(<NetworkSwitcher />);
    await waitFor(() => expect(screen.getByText('Network Error')).toBeInTheDocument());
  });

  it('opens dropdown when button is clicked', async () => {
    mockFetch({ 'network/info': mainnet, 'network/available': [mainnet, testnet] });
    render(<NetworkSwitcher />);
    await waitFor(() => screen.getByText('Mainnet'));
    fireEvent.click(screen.getByRole('button', { name: /Mainnet/i }));
    expect(screen.getByText('Available Networks')).toBeInTheDocument();
  });

  it('shows warning modal when a different network is selected', async () => {
    mockFetch({ 'network/info': mainnet, 'network/available': [mainnet, testnet] });
    render(<NetworkSwitcher />);
    await waitFor(() => screen.getByText('Mainnet'));
    fireEvent.click(screen.getByRole('button', { name: /Mainnet/i }));
    fireEvent.click(screen.getByText('Testnet'));
    expect(screen.getByText('Switch Network')).toBeInTheDocument();
    expect(screen.getByText(/switching from/i)).toBeInTheDocument();
  });

  it('closes warning modal when Cancel is clicked', async () => {
    mockFetch({ 'network/info': mainnet, 'network/available': [mainnet, testnet] });
    render(<NetworkSwitcher />);
    await waitFor(() => screen.getByText('Mainnet'));
    fireEvent.click(screen.getByRole('button', { name: /Mainnet/i }));
    fireEvent.click(screen.getByText('Testnet'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Switch Network')).not.toBeInTheDocument();
  });

  it('calls onNetworkChange after confirming switch', async () => {
    const onNetworkChange = vi.fn();
    mockFetch({
      'network/info': mainnet,
      'network/available': [mainnet, testnet],
      'network/switch': { message: 'Switched' },
    });
    render(<NetworkSwitcher onNetworkChange={onNetworkChange} />);
    await waitFor(() => screen.getByText('Mainnet'));
    fireEvent.click(screen.getByRole('button', { name: /Mainnet/i }));
    fireEvent.click(screen.getByText('Testnet'));
    fireEvent.click(screen.getByRole('button', { name: 'Switch Network' }));
    await waitFor(() => expect(onNetworkChange).toHaveBeenCalledWith(testnet));
  });

  it('does not show warning when same network is selected', async () => {
    mockFetch({ 'network/info': mainnet, 'network/available': [mainnet, testnet] });
    render(<NetworkSwitcher />);
    await waitFor(() => screen.getByText('Mainnet'));
    fireEvent.click(screen.getByRole('button', { name: /Mainnet/i }));
    // Click the already-active network
    const mainnetButtons = screen.getAllByText('Mainnet');
    fireEvent.click(mainnetButtons[mainnetButtons.length - 1]);
    expect(screen.queryByText('Switch Network')).not.toBeInTheDocument();
  });
});
