import { create } from 'zustand';

import type { ConnectionStatus } from '@/types/Connection';

type ConnectionState = {
  status: ConnectionStatus;
};

type ConnectionActions = {
  setStatus: (status: ConnectionStatus) => void;
};

export const useConnectionStore = create<ConnectionState & ConnectionActions>((set) => ({
  status: 'CONNECTED',
  setStatus: (status) => set({ status }),
}));
