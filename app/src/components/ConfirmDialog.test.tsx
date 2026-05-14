import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does NOT fire onConfirm until the user confirms', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Remover?"
        description="Tem certeza?"
        confirmLabel="Remover"
        destructive
        onConfirm={onConfirm}
      >
        <Button>abrir</Button>
      </ConfirmDialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    expect(screen.getByText('Remover?')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fires onConfirm when the confirm action is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Remover?"
        description="Tem certeza?"
        confirmLabel="Remover"
        destructive
        onConfirm={onConfirm}
      >
        <Button>abrir</Button>
      </ConfirmDialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onConfirm when Cancelar is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Remover?"
        description="Tem certeza?"
        confirmLabel="Remover"
        destructive
        onConfirm={onConfirm}
      >
        <Button>abrir</Button>
      </ConfirmDialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
