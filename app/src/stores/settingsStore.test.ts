import { beforeEach, describe, it, expect } from 'vitest';

import { useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  it('starts with empty folder (filled by bootstrapSettings at boot)', () => {
    const s = useSettingsStore.getState();
    expect(s.downloadFolder).toBe('');
    expect(s.cacheTtl).toBe('24h');
  });

  it('setDownloadFolder updates path', () => {
    useSettingsStore.getState().setDownloadFolder('/tmp/x');
    expect(useSettingsStore.getState().downloadFolder).toBe('/tmp/x');
  });

  it('setCacheTtl accepts every option', () => {
    const opts = ['1h', '24h', '7d', 'never'] as const;
    for (const opt of opts) {
      useSettingsStore.getState().setCacheTtl(opt);
      expect(useSettingsStore.getState().cacheTtl).toBe(opt);
    }
  });
});
