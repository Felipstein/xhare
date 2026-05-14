import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useDragDrop } from './useDragDrop';

describe('useDragDrop', () => {
  it('starts not dragging', () => {
    const { result } = renderHook(() => useDragDrop());
    expect(result.current.isDragging).toBe(false);
  });

  it('begin flips to dragging, end resets', () => {
    const { result } = renderHook(() => useDragDrop());
    act(() => result.current.begin());
    expect(result.current.isDragging).toBe(true);
    act(() => result.current.end());
    expect(result.current.isDragging).toBe(false);
  });
});
