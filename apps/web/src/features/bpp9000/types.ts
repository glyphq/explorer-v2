export type BppDirection = "up" | "down" | "split";

export type BppHourStatus = "waiting" | "not_scored" | "correct" | "incorrect" | "no_consensus";

export interface BppHour {
  at: number;
  down: number;
  epoch: number;
  hour: number;
  said: BppDirection | null;
  status: BppHourStatus;
  up: number;
  voters: number;
  went: "up" | "down" | null;
}

export interface BppColony {
  agreement: number;
  bar: number;
  epoch: number;
  hours: BppHour[];
  hoursKnown: number;
  minimum: number;
  scored: {
    correct: number;
    incorrect: number;
    accuracy: number | null;
  };
  totalHours: number;
}

export interface BppRaceEntry {
  errors: number;
  frame: number;
  id: string;
}

export interface BppRace {
  at: string;
  bar: number;
  best: number;
  board: BppRaceEntry[];
  computors: number;
  quorum: number;
  ready: number;
}

export interface BppEpochMeta {
  coreVersion: string;
  solutions: number;
  verified: number;
}

export interface BppSnapshot {
  colony: BppColony | null;
  fetchedAt: string;
  meta: BppEpochMeta | null;
  race: BppRace | null;
}
