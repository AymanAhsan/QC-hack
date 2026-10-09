import type { MissedSummary } from "../src/features/missed/types";

// Test/preview data only. Real screen data comes from /api/missed.
export const sampleSummary: MissedSummary = {
  window_days: 30,
  window_start: "2026-09-09T16:00:00Z",
  window_end: "2026-10-09T16:00:00Z",
  currency: "USD",
  total_missed: 42.5,
  total_earned: 18.2,
  best_possible: 60.7,
  transaction_count: 30,
  daily: Array.from({ length: 31 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 8, 9 + index)).toISOString().slice(0, 10),
    missed: index < 25 ? 1.7 : 0,
    transaction_count: index < 30 ? 1 : 0,
  })),
  by_category: [
    { category: "grocery", missed: 26.5, transaction_count: 16 },
    { category: "retail", missed: 11, transaction_count: 8 },
    { category: "dining", missed: 5, transaction_count: 6 },
  ],
  transactions: [
    { id: "purchase-1", ts: "2026-10-09T14:00:00Z", merchant: "Trader Joe’s", category: "grocery", amount: 42.5, card_used: "Everyday Debit", best_card: "Amex Gold", earned: 0, best_possible: 3.06, missed: 3.06, channel: "store" },
    { id: "purchase-2", ts: "2026-10-08T14:00:00Z", merchant: "Costco", category: "wholesale", amount: 100, card_used: "Chase Freedom", best_card: "Chase Freedom", earned: 5, best_possible: 5, missed: 0, channel: "store" },
    { id: "purchase-3", ts: "2026-10-07T14:00:00Z", merchant: "Nike", category: "retail", amount: 85, card_used: "Everyday Debit", best_card: "Apple Card", earned: 0, best_possible: 2.55, missed: 2.55, channel: "online" },
  ],
};
