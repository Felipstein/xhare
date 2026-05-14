import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import { LocalIpChip } from './LocalIpChip';

describe('LocalIpChip', () => {
  it('renders the local IP from the Tauri command', async () => {
    render(<LocalIpChip />);
    expect(await screen.findByText('192.168.1.42')).toBeInTheDocument();
  });

  it('copies the IP to the clipboard when clicked', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });

    render(<LocalIpChip />);
    const btn = await screen.findByRole('button', { name: /Copiar seu IP/ });
    fireEvent.click(btn);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('192.168.1.42'));
  });
});
