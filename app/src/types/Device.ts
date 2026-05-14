export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export type Device = {
  id: string;
  name: string;
  address: string;
  status: DeviceStatus;
  isSelf: boolean;
};
