import { useFilesStore } from '@/stores/filesStore';
import {
  cancelTransfer,
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
  const markRead = useFilesStore((s) => s.markRead);
  const removeFile = useFilesStore((s) => s.removeFile);

  const onSave = (file: SharedFile): void => {
    void saveFile(file.id);
    markRead(file.id);
  };
  const onOpen = (file: SharedFile): void => {
    void openFile(file.id);
    markRead(file.id);
  };
  const onCopy = (file: SharedFile): void => {
    void copyFile(file.id);
    markRead(file.id);
  };
  const onShowInFolder = (file: SharedFile): void => {
    void showInFolder(file.id);
    markRead(file.id);
  };
  const onDiscard = (file: SharedFile): void => {
    void discardFile(file.id);
  };
  const onResend = (file: SharedFile): void => {
    void resendFile(file.id);
  };
  const onRemove = (file: SharedFile): void => {
    removeFile(file.id);
  };
  const onRetry = (file: SharedFile): void => {
    void resendFile(file.id);
  };
  const onCancel = (file: SharedFile): void => {
    void cancelTransfer(file.id);
  };
  const onActivate = (file: SharedFile): void => {
    void openFile(file.id);
    markRead(file.id);
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
      onCancel,
      onActivate,
    },
  };
}
