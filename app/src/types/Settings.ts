export type CacheTtl = '1h' | '24h' | '7d' | 'never';

export type Settings = {
  downloadFolder: string;
  cacheTtl: CacheTtl;
};
