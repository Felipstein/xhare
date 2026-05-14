import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

import { Tooltip } from '@/components/Tooltip';

import type { ReactElement } from 'react';

export function renderWithTooltip(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => <Tooltip.Provider>{children}</Tooltip.Provider>,
    ...options,
  });
}
