import { create } from 'zustand';

import type { SharedFile } from '@/types/SharedFile';

type FilesState = {
  files: SharedFile[];
  /** Multi-selection for checkbox bulk actions (save many, delete many). */
  selectedIds: string[];
};

type FilesActions = {
  setFiles: (files: SharedFile[]) => void;
  addFile: (file: SharedFile) => void;
  updateFile: (id: string, patch: Partial<SharedFile>) => void;
  replaceFile: (oldId: string, file: SharedFile) => void;
  removeFile: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  toggleSelect: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
};

const initialState: FilesState = {
  files: [],
  selectedIds: [],
};

export const useFilesStore = create<FilesState & FilesActions>((set) => ({
  ...initialState,

  setFiles: (files) => set({ files }),

  addFile: (file) => set((s) => ({ files: [file, ...s.files] })),

  updateFile: (id, patch) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  replaceFile: (oldId, file) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === oldId ? file : f)),
    })),

  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    })),

  markRead: (id) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, isRead: true } : f)),
    })),

  markAllRead: () =>
    set((s) => ({
      files: s.files.map((f) => ({ ...f, isRead: true })),
    })),

  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((sid) => sid !== id)
        : [...s.selectedIds, id],
    })),

  setSelectedIds: (selectedIds) => set({ selectedIds }),

  clearSelection: () => set({ selectedIds: [] }),

  reset: () => set(initialState),
}));
