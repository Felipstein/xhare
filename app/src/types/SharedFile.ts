export type FileKind = 'file' | 'folder' | 'image' | 'video';

export type FileStatus = 'sending' | 'receiving' | 'sent' | 'received' | 'error';

export type SharedFile = {
  id: string;
  name: string;
  size: number;
  kind: FileKind;
  extension?: string;
  thumbnailUrl?: string;
  from: string;
  sentAt: Date;
  status: FileStatus;
  progress?: number;
  speedBps?: number;
  deliveredTo?: string[];
  failedTo?: string[];
  isRead: boolean;
  isPinned: boolean;
  /** Location in the OS cache dir; set on received files until discarded. */
  cachedPath?: string;
  /** Final location after the user saved the file to disk. */
  savedPath?: string;
};
