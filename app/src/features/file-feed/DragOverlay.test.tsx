import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DragOverlay } from './DragOverlay';

describe('DragOverlay', () => {
  it('renders hint text', () => {
    render(<DragOverlay isVisible />);
    expect(screen.getByText(/Solte os arquivos/)).toBeInTheDocument();
  });

  it('sets aria-hidden when not visible', () => {
    const { container } = render(<DragOverlay isVisible={false} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets data-visible when visible', () => {
    const { container } = render(<DragOverlay isVisible />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveAttribute('data-visible', 'true');
  });
});
