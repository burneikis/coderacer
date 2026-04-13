export type Phase = 'waiting' | 'countdown' | 'racing' | 'finished';

export interface Player {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  finished: boolean;
  place?: number;
}

export interface GameState {
  phase: Phase;
  snippet: string;
  snippetName: string;
  players: Player[];
  startTime?: number;
  countdown?: number;
  endCountdown?: number;
  hostId: string | null;
}
