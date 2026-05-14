import { create } from 'zustand';

import { mockFiles } from '@/mock/files';

import type { SharedFile } from '@/types/SharedFile';

type FilesState = {
  files: SharedFile[];
  selectedId: string | null;
};

type FilesActions = {
  setFiles: (files: SharedFile[]) => void;
  addFile: (file: SharedFile) => void;
  updateFile: (id: string, patch: Partial<SharedFile>) => void;
  removeFile: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  select: (id: string | null) => void;
  reset: () => void;
};

const initialState: FilesState = {
  files: mockFiles,
  selectedId: null,
};

export const useFilesStore = create<FilesState & FilesActions>((set) => ({
  ...initialState,

  setFiles: (files) => set({ files }),

  addFile: (file) => set((s) => ({ files: [file, ...s.files] })),

  updateFile: (id, patch) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  removeFile: (id) =>
    set((s) => ({
      files: s.files.filter((f) => f.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
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

  reset: () => set(initialState),
}));
