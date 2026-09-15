export type TVPowerState = "off" | "turning_on" | "on" | "turning_off";

export interface Channel {
  id: string;
  number: number;
  name: string;
  category: "live" | "classic" | "retro" | "test";
  streamUrl: string;
  fallbackUrl?: string;
  description: string;
  isTestCard?: boolean;
}

export interface TVState {
  powerState: TVPowerState;
  currentChannelIndex: number;
  volume: number; // 0 - 100
  isMuted: boolean;
  signalQuality: number; // 0 - 100 (100 is perfect signal, <60 starts snow/jitter)
  antennaAngleL: number; // -45 to 45 deg
  antennaAngleR: number; // -45 to 45 deg
  antennaLength: number; // 0.5 to 1.0
  isSwitchingChannel: boolean;
  osdText: string | null;
  osdSubtext?: string | null;
}
