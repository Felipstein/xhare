import { invoke } from '@tauri-apps/api/core';

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type LogLine = {
  timestamp: string;
  level: LogLevel | string;
  message: string;
};

export function readLogLines(limit = 500): Promise<LogLine[]> {
  return invoke<LogLine[]>('read_log_lines', { limit });
}

export function getLogsDir(): Promise<string> {
  return invoke<string>('get_logs_dir');
}
