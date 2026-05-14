import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { useDevicesStore } from '@/stores/devicesStore';

import { NewDeviceDialog } from './NewDeviceDialog';

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
}

describe('NewDeviceDialog', () => {
  beforeEach(() => {
    useDevicesStore.getState().reset();
  });
  afterEach(() => {
    useDevicesStore.getState().reset();
  });

  it('disables Conectar while IP is empty', () => {
    render(
      <NewDeviceDialog>
        <button>abrir</button>
      </NewDeviceDialog>,
    );
    openDialog();
    expect(screen.getByRole('button', { name: 'Conectar' })).toBeDisabled();
  });

  it('shows validation error for invalid IP after blur', async () => {
    render(
      <NewDeviceDialog>
        <button>abrir</button>
      </NewDeviceDialog>,
    );
    openDialog();
    const input = screen.getByLabelText('Endereço IP');
    fireEvent.change(input, { target: { value: 'not-an-ip' } });
    fireEvent.blur(input);
    expect(await screen.findByText(/inválido/i)).toBeInTheDocument();
  });

  it('enables Conectar with valid IP', () => {
    render(
      <NewDeviceDialog>
        <button>abrir</button>
      </NewDeviceDialog>,
    );
    openDialog();
    fireEvent.change(screen.getByLabelText('Endereço IP'), { target: { value: '10.0.0.5' } });
    expect(screen.getByRole('button', { name: 'Conectar' })).toBeEnabled();
  });

  it('adds the device on submit and closes the dialog', async () => {
    render(
      <NewDeviceDialog>
        <button>abrir</button>
      </NewDeviceDialog>,
    );
    openDialog();
    fireEvent.change(screen.getByLabelText('Endereço IP'), {
      target: { value: '10.0.0.5' },
    });
    fireEvent.change(screen.getByLabelText('Nome (opcional)'), {
      target: { value: 'novo-pc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }));

    await waitFor(() => {
      expect(
        useDevicesStore.getState().devices.find((d) => d.address === '10.0.0.5'),
      ).toMatchObject({ name: 'novo-pc', status: 'ONLINE' });
    });
  });
});
