import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

import { renderWithTooltip } from '@/test/renderWithTooltip';

import { DeviceItem } from './DeviceItem';

import type { Device } from '@/types/Device';

const onlineDevice: Device = {
  id: 'mdns:macbook-pro._xhare._tcp.local.',
  name: 'macbook-pro',
  address: '192.168.1.10',
  status: 'ONLINE',
  isSelf: false,
};

const offlineDevice: Device = {
  id: 'lan:192.168.1.12',
  name: 'imac-studio',
  address: '192.168.1.12',
  status: 'OFFLINE',
  isSelf: false,
};

const selfDevice: Device = {
  id: 'self:felipes-mac._xhare._tcp.local.',
  name: 'felipes-mac',
  address: '192.168.1.5',
  status: 'ONLINE',
  isSelf: true,
};

describe('DeviceItem', () => {
  it('renders device name and address', () => {
    renderWithTooltip(
      <ul>
        <DeviceItem device={onlineDevice} />
      </ul>,
    );
    expect(screen.getByText('macbook-pro')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
  });

  it('marks self with the "(você)" tag', () => {
    renderWithTooltip(
      <ul>
        <DeviceItem device={selfDevice} />
      </ul>,
    );
    expect(screen.getByText('(você)')).toBeInTheDocument();
  });

  it('renders an offline device with greyed text', () => {
    const { container } = renderWithTooltip(
      <ul>
        <DeviceItem device={offlineDevice} />
      </ul>,
    );
    expect(screen.getByText('imac-studio')).toBeInTheDocument();
    const dot = container.querySelector('[aria-hidden]');
    expect(dot?.className).toContain('bg-zinc-600');
  });
});
