import { describe, it, expect, beforeEach } from 'vitest';

import { useConnectionStore } from './connectionStore';

describe('connectionStore', () => {
  beforeEach(() => {
    useConnectionStore.getState().setStatus('CONNECTED');
  });

  it('starts CONNECTED by default after reset', () => {
    expect(useConnectionStore.getState().status).toBe('CONNECTED');
  });

  it('setStatus updates the status', () => {
    useConnectionStore.getState().setStatus('DISCONNECTED');
    expect(useConnectionStore.getState().status).toBe('DISCONNECTED');
    useConnectionStore.getState().setStatus('CONNECTING');
    expect(useConnectionStore.getState().status).toBe('CONNECTING');
  });
});
