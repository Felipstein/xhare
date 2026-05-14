import { beforeEach, describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

import { useConnectionStore } from '@/stores/connectionStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { useFilesStore } from '@/stores/filesStore';
import { renderWithTooltip } from '@/test/renderWithTooltip';

import { FileFeed } from './FileFeed';

describe('FileFeed', () => {
  beforeEach(() => {
    useFilesStore.getState().reset();
    useDevicesStore.getState().reset();
    useConnectionStore.getState().setStatus('CONNECTED');
  });

  it('renders file rows by default', () => {
    renderWithTooltip(<FileFeed />);
    expect(screen.getByText('design-mockup.jpg')).toBeInTheDocument();
  });

  it('shows empty state when there are no files', () => {
    useFilesStore.getState().setFiles([]);
    renderWithTooltip(<FileFeed />);
    expect(screen.getByText(/Nenhum arquivo compartilhado/)).toBeInTheDocument();
  });

  it('shows no-devices placeholder when device list is empty', () => {
    useDevicesStore.getState().setDevices([]);
    renderWithTooltip(<FileFeed />);
    expect(screen.getByText(/Aguardando dispositivos/)).toBeInTheDocument();
  });

  it('shows network error placeholder when disconnected', () => {
    useConnectionStore.getState().setStatus('DISCONNECTED');
    renderWithTooltip(<FileFeed />);
    expect(screen.getByText(/Não foi possível conectar/)).toBeInTheDocument();
  });
});
