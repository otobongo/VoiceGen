export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  description: string;
  gender: 'Male' | 'Female';
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: VoiceName.Puck, name: 'Puck', description: 'Energetic & clear', gender: 'Male' },
  { id: VoiceName.Charon, name: 'Charon', description: 'Deep & authoritative', gender: 'Male' },
  { id: VoiceName.Kore, name: 'Kore', description: 'Calm & soothing', gender: 'Female' },
  { id: VoiceName.Fenrir, name: 'Fenrir', description: 'Strong & dynamic', gender: 'Male' },
  { id: VoiceName.Zephyr, name: 'Zephyr', description: 'Soft & gentle', gender: 'Female' },
];

export interface TTSState {
  text: string;
  voice: VoiceName;
  isLoading: boolean;
  audioUrl: string | null;
  error: string | null;
}