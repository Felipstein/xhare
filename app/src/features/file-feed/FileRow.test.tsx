import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithTooltip } from '@/test/renderWithTooltip';

import { FileRow } from './FileRow';

import type { SharedFile } from '@/types/SharedFile';

const baseFile: SharedFile = {
  id: 'f1',
  name: 'design-mockup.jpg',
  size: 2.4 * 1024 * 1024,
  kind: 'image',
  from: 'ipad-air',
  sentAt: new Date(Date.now() - 2 * 60_000),
  status: 'received',
  isRead: false,
  isPinned: false,
};

const noopHandlers = {
  onSave: vi.fn(),
  onOpen: vi.fn(),
  onCopy: vi.fn(),
  onShowInFolder: vi.fn(),
  onDiscard: vi.fn(),
  onResend: vi.fn(),
  onRemove: vi.fn(),
  onRetry: vi.fn(),
};

describe('FileRow', () => {
  it('renders file name and size', () => {
    renderWithTooltip(<FileRow file={baseFile} {...noopHandlers} />);
    expect(screen.getByText('design-mockup.jpg')).toBeInTheDocument();
    expect(screen.getByText('2.4 MB')).toBeInTheDocument();
  });

  it('marks unread with data attribute when received and not read', () => {
    const { container } = renderWithTooltip(<FileRow file={baseFile} {...noopHandlers} />);
    const row = container.querySelector('[role="listitem"]');
    expect(row).toHaveAttribute('data-unread', 'true');
  });

  it('does not mark unread when isRead=true', () => {
    const { container } = renderWithTooltip(
      <FileRow file={{ ...baseFile, isRead: true }} {...noopHandlers} />,
    );
    const row = container.querySelector('[role="listitem"]');
    expect(row).not.toHaveAttribute('data-unread');
  });

  it('shows progress bar when status is sending', () => {
    renderWithTooltip(
      <FileRow
        file={{
          ...baseFile,
          status: 'sending',
          progress: 67,
          speedBps: 4.2 * 1024 * 1024,
          from: 'você',
        }}
        {...noopHandlers}
      />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/67%/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2 MB\/s/)).toBeInTheDocument();
  });

  it('shows progress bar when status is receiving (without speed)', () => {
    renderWithTooltip(
      <FileRow
        file={{ ...baseFile, status: 'receiving', progress: 50 }}
        {...noopHandlers}
      />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows error badge and retry button when status is error', () => {
    renderWithTooltip(<FileRow file={{ ...baseFile, status: 'error' }} {...noopHandlers} />);
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('renders 5 hover icons when status is received', () => {
    renderWithTooltip(<FileRow file={baseFile} {...noopHandlers} />);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar no Finder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();
  });

  it('renders Reenviar + Remover buttons when status is sent', () => {
    renderWithTooltip(
      <FileRow
        file={{ ...baseFile, status: 'sent', from: 'você', isRead: true }}
        {...noopHandlers}
      />,
    );
    expect(screen.getByRole('button', { name: /Reenviar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remover/ })).toBeInTheDocument();
  });

  it('fires onSave when save icon is clicked', () => {
    renderWithTooltip(<FileRow file={baseFile} {...noopHandlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(noopHandlers.onSave).toHaveBeenCalledWith(baseFile);
  });

  it('renders folder subtitle for folder kind', () => {
    renderWithTooltip(
      <FileRow
        file={{ ...baseFile, kind: 'folder', name: 'projeto-assets/', isRead: true }}
        {...noopHandlers}
      />,
    );
    expect(screen.getByText(/23 arquivos/)).toBeInTheDocument();
  });

  it('renders ↑ você for sent-from-self file', () => {
    renderWithTooltip(
      <FileRow
        file={{ ...baseFile, status: 'sent', from: 'você', isRead: true }}
        {...noopHandlers}
      />,
    );
    expect(screen.getByText('você')).toBeInTheDocument();
  });

  it('does NOT show a delivery-recipients column anymore', () => {
    renderWithTooltip(
      <FileRow
        file={{
          ...baseFile,
          status: 'sent',
          from: 'você',
          isRead: true,
          deliveredTo: ['macbook-pro', 'ipad-air'],
          failedTo: ['imac-studio'],
        }}
        {...noopHandlers}
      />,
    );
    expect(screen.queryByRole('button', { name: /Detalhes da entrega/ })).toBeNull();
  });
});
