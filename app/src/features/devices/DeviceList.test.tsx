import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useConnectionStore } from '@/stores/connectionStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { sampleDevices } from '@/test/fixtures';

import { DeviceList } from './DeviceList';

describe('DeviceList', () => {
  beforeEach(() => {
    useDevicesStore.getState().reset();
    useConnectionStore.getState().setStatus('CONNECTED');
  });

  it('renders all devices when connected', () => {
    useDevicesStore.getState().setDevices(sampleDevices);
    render(<DeviceList />);
    expect(screen.getByText('macbook-pro')).toBeInTheDocument();
    expect(screen.getByText('ipad-air')).toBeInTheDocument();
    expect(screen.getByText('imac-studio')).toBeInTheDocument();
    expect(screen.getByText('iphone-15')).toBeInTheDocument();
  });

  it('shows empty state when no devices and connected', () => {
    render(<DeviceList />);
    expect(screen.getByText(/Nenhum dispositivo/)).toBeInTheDocument();
  });

  it('shows disconnected state with retry button', () => {
    useConnectionStore.getState().setStatus('DISCONNECTED');
    render(<DeviceList />);
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument();
  });

  it('shows connecting state', () => {
    useConnectionStore.getState().setStatus('CONNECTING');
    render(<DeviceList />);
    expect(screen.getByText(/Conectando/)).toBeInTheDocument();
  });
});
