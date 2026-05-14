import { useConnectionStore } from '@/stores/connectionStore';

export async function reconnect(): Promise<void> {
  const { setStatus } = useConnectionStore.getState();
  setStatus('CONNECTING');
  await new Promise((resolve) => setTimeout(resolve, 800));
  setStatus('CONNECTED');
}
