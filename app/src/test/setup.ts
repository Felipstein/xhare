import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

import { useDevicesStore } from '@/stores/devicesStore';
import type { Device } from '@/types/Device';

// ─── Mock Tauri APIs so tests can run without the real runtime ────────────

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === 'get_devices') {
      return useDevicesStore.getState().devices;
    }
    if (cmd === 'add_device_by_ip') {
      const address = String(args?.address ?? '');
      const explicit = (args?.name as string | null | undefined) ?? null;
      const device: Device = {
        id: `manual:${address}`,
        address,
        name: explicit && explicit.trim().length > 0 ? explicit : address,
        status: 'ONLINE',
        isSelf: false,
      };
      useDevicesStore.getState().addDevice(device);
      return device;
    }
    if (cmd === 'remove_device') {
      const id = String(args?.id ?? '');
      useDevicesStore.getState().removeDevice(id);
      return null;
    }
    if (cmd === 'probe_device') {
      return null;
    }
    if (cmd === 'get_local_ip') {
      return '192.168.1.42';
    }
    if (cmd === 'get_default_download_folder') {
      return '/tmp/Xhare';
    }
    if (cmd === 'load_settings') {
      return { downloadFolder: '/tmp/Xhare', cacheTtl: '24h' };
    }
    if (cmd === 'save_settings') {
      return null;
    }
    if (cmd === 'send_file') {
      return {
        id: 'mock-send-id',
        name: 'mock.txt',
        size: 0,
        from: 'mock',
      };
    }
    if (
      cmd === 'save_cached_file' ||
      cmd === 'discard_cached_file' ||
      cmd === 'open_path' ||
      cmd === 'reveal_path'
    ) {
      return null;
    }
    if (cmd === 'read_log_lines') {
      return [];
    }
    if (cmd === 'get_logs_dir') {
      return '/tmp/logs';
    }
    return null;
  }),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async () => () => {}),
  emit: vi.fn(async () => {}),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    startDragging: vi.fn(async () => {}),
    toggleMaximize: vi.fn(async () => {}),
  }),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(async () => null),
}));

// ─── DOM polyfills jsdom lacks ────────────────────────────────────────────

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = (): boolean => false;
  HTMLElement.prototype.setPointerCapture = (): void => {};
  HTMLElement.prototype.releasePointerCapture = (): void => {};
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = (): void => {};
}

afterEach(() => {
  cleanup();
});
