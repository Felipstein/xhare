import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DeviceItem } from './DeviceItem';

import type { Device } from '@/types/Device';

const onlineDevice: Device = {
  name: 'macbook-pro',
  address: '192.168.1.10',
  status: 'ONLINE',
};

const offlineDevice: Device = {
  name: 'imac-studio',
  address: '192.168.1.12',
  status: 'OFFLINE',
};

describe('DeviceItem', () => {
  it('renders device name', () => {
    render(
      <ul>
        <DeviceItem device={onlineDevice} />
      </ul>,
    );
    expect(screen.getByText('macbook-pro')).toBeInTheDocument();
  });

  it('renders as a list item (not selectable)', () => {
    render(
      <ul>
        <DeviceItem device={offlineDevice} />
      </ul>,
    );
    expect(screen.getByRole('listitem')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
