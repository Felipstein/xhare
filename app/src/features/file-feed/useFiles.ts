import { useFilesStore } from '@/stores/filesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  copyFile,
  discardFile,
  openFile,
  resendFile,
  saveFile,
  showInFolder,
} from '@/services/files';

import type { SharedFile } from '@/types/SharedFile';

export function useFiles() {
  const files = useFilesStore((s) => s.files);
  const removeFile = useFilesStore((s) => s.removeFile);

  const onSave = (file: SharedFile): void => {
    const dest = useSettingsStore.getState().downloadFolder;
    if (!dest) return;
    void saveFile(file, dest);
  };
  const onOpen = (file: SharedFile): void => {
    void openFile(file);
  };
  const onCopy = (file: SharedFile): void => {
    void copyFile(file);
  };
  const onShowInFolder = (file: SharedFile): void => {
    void showInFolder(file);
  };
  const onDiscard = (file: SharedFile): void => {
    void discardFile(file);
  };
  const onResend = (file: SharedFile): void => {
    void resendFile(file);
  };
  const onRemove = (file: SharedFile): void => {
    removeFile(file.id);
  };
  const onRetry = (file: SharedFile): void => {
    void resendFile(file);
  };
  const onActivate = (file: SharedFile): void => {
    void openFile(file);
  };

  return {
    files,
    handlers: {
      onSave,
      onOpen,
      onCopy,
      onShowInFolder,
      onDiscard,
      onResend,
      onRemove,
      onRetry,
      onActivate,
    },
  };
}
