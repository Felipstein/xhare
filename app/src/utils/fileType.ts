import type { SharedFile } from '@/types/SharedFile';

const TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  doc: 'Documento Word',
  docx: 'Documento Word',
  xls: 'Planilha',
  xlsx: 'Planilha',
  ppt: 'Apresentação',
  pptx: 'Apresentação',
  txt: 'Texto',
  md: 'Markdown',
  rtf: 'Texto formatado',
  zip: 'Arquivo ZIP',
  rar: 'Arquivo RAR',
  '7z': 'Arquivo 7-Zip',
  tar: 'Arquivo TAR',
  gz: 'Arquivo comprimido',
  dmg: 'Imagem de disco',
  iso: 'Imagem ISO',
  exe: 'Aplicativo Windows',
  app: 'Aplicativo macOS',
  jpg: 'Imagem JPEG',
  jpeg: 'Imagem JPEG',
  png: 'Imagem PNG',
  gif: 'Imagem GIF',
  webp: 'Imagem WebP',
  heic: 'Imagem HEIC',
  svg: 'Imagem SVG',
  mp4: 'Vídeo MP4',
  mov: 'Vídeo QuickTime',
  webm: 'Vídeo WebM',
  mkv: 'Vídeo Matroska',
  avi: 'Vídeo AVI',
  mp3: 'Áudio MP3',
  wav: 'Áudio WAV',
  flac: 'Áudio FLAC',
  ogg: 'Áudio OGG',
  m4a: 'Áudio M4A',
  json: 'JSON',
  xml: 'XML',
  csv: 'CSV',
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  ts: 'TypeScript',
};

export function getExtension(name: string): string | undefined {
  const idx = name.lastIndexOf('.');
  if (idx < 0 || idx === name.length - 1) return undefined;
  return name.slice(idx + 1).toLowerCase();
}

export function humanFileType(file: Pick<SharedFile, 'name' | 'kind' | 'extension'>): string {
  if (file.kind === 'folder') return 'Pasta';
  const ext = file.extension ?? getExtension(file.name);
  if (ext) {
    const label = TYPE_LABELS[ext];
    if (label) return label;
    return `Arquivo .${ext.toUpperCase()}`;
  }
  return 'Arquivo';
}

export function extensionBadge(file: Pick<SharedFile, 'name' | 'kind' | 'extension'>): string | null {
  if (file.kind === 'folder') return null;
  const ext = file.extension ?? getExtension(file.name);
  return ext ? ext.toUpperCase() : null;
}
