// Feature-owned contracts. Omar may re-export these from the shared types module.
export interface Transaction {
  id: string;
  ts: string;
  merchant: string;
  category: string;
  amount: number;
  card_used: string;
  best_card: string;
  earned: number;
  best_possible: number;
  missed: number;
  channel: "store" | "online";
}

export interface DailyMissed {
  date: string;
  missed: number;
  transaction_count: number;
}

export interface MissedSummary {
  window_days: 30;
  window_start: string;
  window_end: string;
  currency: "USD";
  total_missed: number;
  total_earned: number;
  best_possible: number;
  transaction_count: number;
  daily: DailyMissed[];
  by_category: { category: string; missed: number; transaction_count: number }[];
  transactions: Transaction[];
}

export type MissedLoader = (signal: AbortSignal) => Promise<MissedSummary>;
