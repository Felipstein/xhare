import {
  CodeIcon,
  FileIcon as FileIconLucide,
  FileTextIcon,
  FilmIcon,
  FolderIcon,
  ImageIcon,
  TerminalIcon,
} from 'lucide-react';

import { cn } from '@/utils/cn';

import type { LucideIcon } from 'lucide-react';
import type { SharedFile } from '@/types/SharedFile';

type Props = {
  file: SharedFile;
  className?: string;
};

type Badge = {
  label: string;
  bg: string;
  icon?: LucideIcon;
};

const COLOR_DOC = 'bg-red-500/15 text-red-400 border-red-500/30';
const COLOR_ARCHIVE = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
const COLOR_WORD = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
const COLOR_SHEET = 'bg-green-500/15 text-green-400 border-green-500/30';
const COLOR_IMAGE = 'bg-violet-500/15 text-violet-400 border-violet-500/30';
const COLOR_VIDEO = 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30';
const COLOR_TEXT = 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
const COLOR_CODE = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
const COLOR_MARKUP = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
const COLOR_EXE = 'bg-rose-500/15 text-rose-400 border-rose-500/30';

const BADGE_BY_EXT: Record<string, Badge> = {
  // Documents
  pdf: { label: 'PDF', bg: COLOR_DOC, icon: FileTextIcon },
  doc: { label: 'DOC', bg: COLOR_WORD, icon: FileTextIcon },
  docx: { label: 'DOC', bg: COLOR_WORD, icon: FileTextIcon },
  xls: { label: 'XLS', bg: COLOR_SHEET, icon: FileTextIcon },
  xlsx: { label: 'XLS', bg: COLOR_SHEET, icon: FileTextIcon },
  ppt: { label: 'PPT', bg: COLOR_DOC, icon: FileTextIcon },
  pptx: { label: 'PPT', bg: COLOR_DOC, icon: FileTextIcon },
  rtf: { label: 'RTF', bg: COLOR_TEXT, icon: FileTextIcon },
  txt: { label: 'TXT', bg: COLOR_TEXT, icon: FileTextIcon },
  md: { label: 'MD', bg: COLOR_TEXT, icon: FileTextIcon },

  // Archives
  zip: { label: 'ZIP', bg: COLOR_ARCHIVE },
  rar: { label: 'RAR', bg: COLOR_ARCHIVE },
  '7z': { label: '7Z', bg: COLOR_ARCHIVE },
  tar: { label: 'TAR', bg: COLOR_ARCHIVE },
  gz: { label: 'GZ', bg: COLOR_ARCHIVE },

  // Images (only when no thumbnail is available; thumbnails win earlier)
  png: { label: 'PNG', bg: COLOR_IMAGE, icon: ImageIcon },
  jpg: { label: 'JPG', bg: COLOR_IMAGE, icon: ImageIcon },
  jpeg: { label: 'JPG', bg: COLOR_IMAGE, icon: ImageIcon },
  gif: { label: 'GIF', bg: COLOR_IMAGE, icon: ImageIcon },
  webp: { label: 'WEBP', bg: COLOR_IMAGE, icon: ImageIcon },
  heic: { label: 'HEIC', bg: COLOR_IMAGE, icon: ImageIcon },
  svg: { label: 'SVG', bg: COLOR_IMAGE, icon: ImageIcon },

  // Video / audio
  mp4: { label: 'MP4', bg: COLOR_VIDEO, icon: FilmIcon },
  mov: { label: 'MOV', bg: COLOR_VIDEO, icon: FilmIcon },
  webm: { label: 'WEBM', bg: COLOR_VIDEO, icon: FilmIcon },
  mkv: { label: 'MKV', bg: COLOR_VIDEO, icon: FilmIcon },
  avi: { label: 'AVI', bg: COLOR_VIDEO, icon: FilmIcon },
  mp3: { label: 'MP3', bg: COLOR_VIDEO, icon: FilmIcon },
  wav: { label: 'WAV', bg: COLOR_VIDEO, icon: FilmIcon },

  // Markup
  html: { label: 'HTML', bg: COLOR_MARKUP, icon: CodeIcon },
  htm: { label: 'HTML', bg: COLOR_MARKUP, icon: CodeIcon },
  xml: { label: 'XML', bg: COLOR_MARKUP, icon: CodeIcon },
  css: { label: 'CSS', bg: COLOR_MARKUP, icon: CodeIcon },
  scss: { label: 'SCSS', bg: COLOR_MARKUP, icon: CodeIcon },
  json: { label: 'JSON', bg: COLOR_MARKUP, icon: CodeIcon },
  yaml: { label: 'YAML', bg: COLOR_MARKUP, icon: CodeIcon },
  yml: { label: 'YAML', bg: COLOR_MARKUP, icon: CodeIcon },
  toml: { label: 'TOML', bg: COLOR_MARKUP, icon: CodeIcon },

  // Code
  js: { label: 'JS', bg: COLOR_CODE, icon: CodeIcon },
  mjs: { label: 'JS', bg: COLOR_CODE, icon: CodeIcon },
  cjs: { label: 'JS', bg: COLOR_CODE, icon: CodeIcon },
  ts: { label: 'TS', bg: COLOR_CODE, icon: CodeIcon },
  jsx: { label: 'JSX', bg: COLOR_CODE, icon: CodeIcon },
  tsx: { label: 'TSX', bg: COLOR_CODE, icon: CodeIcon },
  py: { label: 'PY', bg: COLOR_CODE, icon: CodeIcon },
  rb: { label: 'RB', bg: COLOR_CODE, icon: CodeIcon },
  go: { label: 'GO', bg: COLOR_CODE, icon: CodeIcon },
  rs: { label: 'RS', bg: COLOR_CODE, icon: CodeIcon },
  java: { label: 'JAVA', bg: COLOR_CODE, icon: CodeIcon },
  kt: { label: 'KT', bg: COLOR_CODE, icon: CodeIcon },
  swift: { label: 'SWIFT', bg: COLOR_CODE, icon: CodeIcon },
  c: { label: 'C', bg: COLOR_CODE, icon: CodeIcon },
  h: { label: 'H', bg: COLOR_CODE, icon: CodeIcon },
  cpp: { label: 'C++', bg: COLOR_CODE, icon: CodeIcon },
  hpp: { label: 'HPP', bg: COLOR_CODE, icon: CodeIcon },
  cs: { label: 'C#', bg: COLOR_CODE, icon: CodeIcon },
  php: { label: 'PHP', bg: COLOR_CODE, icon: CodeIcon },
  sql: { label: 'SQL', bg: COLOR_CODE, icon: CodeIcon },

  // Executables / scripts
  exe: { label: 'EXE', bg: COLOR_EXE, icon: TerminalIcon },
  dmg: { label: 'DMG', bg: COLOR_EXE, icon: TerminalIcon },
  app: { label: 'APP', bg: COLOR_EXE, icon: TerminalIcon },
  msi: { label: 'MSI', bg: COLOR_EXE, icon: TerminalIcon },
  deb: { label: 'DEB', bg: COLOR_EXE, icon: TerminalIcon },
  apk: { label: 'APK', bg: COLOR_EXE, icon: TerminalIcon },
  sh: { label: 'SH', bg: COLOR_EXE, icon: TerminalIcon },
  bat: { label: 'BAT', bg: COLOR_EXE, icon: TerminalIcon },
  ps1: { label: 'PS1', bg: COLOR_EXE, icon: TerminalIcon },
};

export function FileIcon({ file, className }: Props) {
  if (file.kind === 'folder') {
    return (
      <div
        className={cn(
          'shrink-0 size-10 rounded-md flex items-center justify-center bg-zinc-700/50 text-zinc-400',
          className,
        )}
      >
        <FolderIcon className="size-5" />
      </div>
    );
  }

  if ((file.kind === 'image' || file.kind === 'video') && file.thumbnailUrl) {
    return (
      <div
        className={cn(
          'shrink-0 size-10 rounded-md overflow-hidden bg-zinc-800',
          className,
        )}
      >
        <img
          src={file.thumbnailUrl}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  const ext = file.extension?.toLowerCase();
  const badge = ext ? BADGE_BY_EXT[ext] : undefined;

  if (badge) {
    return (
      <div
        className={cn(
          'shrink-0 size-10 rounded-md flex flex-col items-center justify-center border text-[9px] font-bold tracking-wider',
          badge.bg,
          className,
        )}
      >
        <FileTextIcon className="size-4 mb-0.5 opacity-80" />
        <span>{badge.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'shrink-0 size-10 rounded-md flex items-center justify-center bg-zinc-700/50 text-zinc-400',
        className,
      )}
    >
      <FileIconLucide className="size-5" />
    </div>
  );
}
