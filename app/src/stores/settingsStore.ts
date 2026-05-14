import { create } from 'zustand';

import { loadSettings, saveSettings } from '@/services/settings';

import type { CacheTtl, Settings } from '@/types/Settings';

type SettingsActions = {
  setDownloadFolder: (folder: string) => void;
  setCacheTtl: (ttl: CacheTtl) => void;
  reset: () => void;
};

const initialState: Settings = {
  downloadFolder: '',
  cacheTtl: '24h',
};

export const useSettingsStore = create<Settings & SettingsActions>((set) => ({
  ...initialState,

  setDownloadFolder: (downloadFolder) => {
    set({ downloadFolder });
    void persist();
  },
  setCacheTtl: (cacheTtl) => {
    set({ cacheTtl });
    void persist();
  },
  reset: () => set(initialState),
}));

async function persist(): Promise<void> {
  const { downloadFolder, cacheTtl } = useSettingsStore.getState();
  if (downloadFolder.length === 0) return; // skip pre-bootstrap state
  try {
    await saveSettings({ downloadFolder, cacheTtl });
  } catch (err) {
    console.error('saveSettings failed:', err);
  }
}

/**
 * One-shot bootstrap. Loads the persisted settings file from disk; if it
 * doesn't exist yet, Rust returns sensible defaults (incl. OS-appropriate
 * download folder). Called once from App.tsx.
 */
export async function bootstrapSettings(): Promise<void> {
  try {
    const settings = await loadSettings();
    useSettingsStore.setState({
      downloadFolder: settings.downloadFolder,
      cacheTtl: settings.cacheTtl,
    });
  } catch (err) {
    console.error('loadSettings failed:', err);
  }
}
