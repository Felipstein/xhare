import { create } from 'zustand';

import type { SharedFile } from '@/types/SharedFile';

type FilesState = {
  files: SharedFile[];
  selectedId: string | null;
  /** Multi-selection (checkbox bulk actions). Distinct from `selectedId` which
   * is a single-row focus pointer used by keyboard navigation. */
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
  select: (id: string | null) => void;
  toggleSelect: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  reset: () => void;
};

const initialState: FilesState = {
  files: [],
  selectedId: null,
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
      selectedId: s.selectedId === oldId ? file.id : s.selectedId,
    })),

  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
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

  select: (selectedId) => set({ selectedId }),

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
