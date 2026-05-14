import { create } from 'zustand';

import type { CacheTtl, Settings } from '@/types/Settings';

type SettingsActions = {
  setDownloadFolder: (folder: string) => void;
  setCacheTtl: (ttl: CacheTtl) => void;
  reset: () => void;
};

const initialState: Settings = {
  downloadFolder: '~/Downloads/Xhare',
  cacheTtl: '24h',
};

export const useSettingsStore = create<Settings & SettingsActions>((set) => ({
  ...initialState,

  setDownloadFolder: (downloadFolder) => set({ downloadFolder }),
  setCacheTtl: (cacheTtl) => set({ cacheTtl }),
  reset: () => set(initialState),
}));
