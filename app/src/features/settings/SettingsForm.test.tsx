import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { useSettingsStore } from '@/stores/settingsStore';

import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it('shows the current download folder path', () => {
    render(<SettingsForm />);
    expect(screen.getByText('~/Downloads/Xhare')).toBeInTheDocument();
  });

  it('renders all four TTL options', () => {
    render(<SettingsForm />);
    expect(screen.getByLabelText('1 hora')).toBeInTheDocument();
    expect(screen.getByLabelText('24 horas')).toBeInTheDocument();
    expect(screen.getByLabelText('7 dias')).toBeInTheDocument();
    expect(screen.getByLabelText('Nunca')).toBeInTheDocument();
  });

  it('does NOT render the "Perguntar sempre" checkbox', () => {
    render(<SettingsForm />);
    expect(screen.queryByLabelText('Perguntar sempre')).toBeNull();
  });

  it('disables Salvar until the form is dirty', () => {
    render(<SettingsForm />);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('persists the new TTL to the store after Salvar', async () => {
    render(<SettingsForm />);
    fireEvent.click(screen.getByLabelText('7 dias'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(useSettingsStore.getState().cacheTtl).toBe('7d'));
  });

  it('discards changes when Cancelar is clicked', () => {
    const onCancel = vi.fn();
    render(<SettingsForm onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText('7 dias'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(useSettingsStore.getState().cacheTtl).toBe('24h');
    expect(onCancel).toHaveBeenCalled();
  });

  it('invokes onSaved after a successful save', async () => {
    const onSaved = vi.fn();
    render(<SettingsForm onSaved={onSaved} />);
    fireEvent.click(screen.getByLabelText('1 hora'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });
});
