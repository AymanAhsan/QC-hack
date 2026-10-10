// Shared API contract. Mirrors backend/schemas.py; documented in docs/API.md.
// Change field names only through a contract PR.
//
// Money: integer cents (`*Cents` / `*_cents`). Percent: percent units (7.2 = 7.2%).

export type Network = 'visa' | 'mastercard' | 'amex'
export type RewardType = 'points' | 'cash'
export type RateSource = 'merchant' | 'category' | 'base'
export type CouponKind = 'percent' | 'fixed' | 'shipping'
export type CouponSource = 'demo_catalog' | 'ai_simulated' | 'simulated_fallback'
export type Channel = 'store' | 'online'
export type DealFeed = 'meals' | 'clothing' | 'travel'
export type CardType = 'amex-gold' | 'chase-sapphire' | 'chase-freedom' | 'venture-x' | 'apple-card' | 'everyday-debit'

export interface CardCreate {
  type: CardType
  last4: string
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, unknown>
}

// ---------------------------------------------------------------- wallet

export interface Card {
  id: string
  user_id: string
  type: CardType
  image: string
  name: string
  issuer: string
  network: Network
  last4: string
  reward_type: RewardType
  cpp: number
  base_rate: number
  category_rates: Record<string, number>
  merchant_rates: Record<string, number>
  gradient: [string, string]
  glow: string
  text_color: string
  is_default_debit: boolean
}

export interface WalletResponse {
  cards: Card[]
  default_debit_card_id: string | null
  is_demo_data: true
}

export interface Coupon {
  code: string
  kind: CouponKind
  value: number
  description: string
  min_spend_cents: number
  max_discount_cents: number | null
  source: CouponSource
  is_simulated: true
  label: string
}

export interface Merchant {
  id: string
  name: string
  known: boolean
  category: string
  category_label: string
  mcc: string
  mcc_label: string
  mcc_note: string | null
  accepts: Network[]
  channels: Channel[]
  typical_cents: number
  deal_feed: DealFeed | null
  emoji: string
  coupons: Coupon[]
}

export interface Location {
  id: string
  merchant: Merchant
  address: string
  distance_m: number
}

export interface LocationsResponse {
  locations: Location[]
  is_demo_data: true
}

// ---------------------------------------------------------------- recommend

export interface CardEvaluation {
  card_id: string
  card_name: string
  network: Network
  accepted: boolean
  rejection_reason: string | null
  multiplier: number
  rate_source: RateSource
  rate_label: string
  yield_pct: number
  points: number | null
  value_cents: number
  rank: number | null
  is_winner: boolean
}

export interface WhyMargin {
  card_id: string
  card_name: string
  value_cents: number
  advantage_cents: number
  advantage_pct: number
}

export interface WhyBreakdown {
  network: {
    network: Network
    label: string
    rejections: { card_id: string; network: Network; label: string }[]
  }
  mcc: { code: string; label: string; category: string; category_label: string; note: string | null }
  rate: { multiplier: number; source: RateSource; label: string }
  valuation: {
    reward_type: RewardType
    base_yield_pct: number
    multiplier: number
    cpp: number
    net_yield_pct: number
    summary: string
  }
  advantage: { runner_up: WhyMargin | null; default_debit: WhyMargin | null }
  amount_cents: number
}

export interface RecommendResponse {
  merchant: Merchant
  amount_cents: number
  winner_card_id: string | null
  no_accepted_card: boolean
  ranking: CardEvaluation[]
  why: WhyBreakdown | null
  is_demo_data: true
}

// ---------------------------------------------------------------- stack

export interface StackRequest {
  merchant_id?: string
  merchant_name?: string
  subtotal_cents: number
  shipping_cents?: number | null
}

export interface CouponCheck {
  coupon: Coupon
  eligible: boolean
  reason: string | null
  savings_cents: number
}

export interface StackResponse {
  merchant: Merchant
  merchant_known: boolean
  subtotal_cents: number
  shipping_cents: number | null
  original_total_cents: number
  coupon: CouponCheck | null
  coupons_considered: CouponCheck[]
  charge_cents: number
  winner_card_id: string | null
  no_accepted_card: boolean
  ranking: CardEvaluation[]
  rewards_value_cents: number
  total_value_cents: number
  total_value_pct: number
  is_demo_data: true
}

// ---------------------------------------------------------------- deals

export interface Deal {
  merchant: Merchant
  example_subtotal_cents: number
  coupon: CouponCheck | null
  winner_card_id: string | null
  winner_card_name: string | null
  card_yield_pct: number
  rewards_value_cents: number
  total_value_cents: number
  total_value_pct: number
  headline: string
}

export interface DealCategory {
  id: DealFeed
  label: string
  emoji: string
  deals: Deal[]
}

export interface DealsResponse {
  categories: DealCategory[]
  is_demo_data: true
}

// ---------------------------------------------------------------- transactions

export interface TransactionCreate {
  idempotency_key: string
  merchant_id?: string
  merchant_name?: string
  subtotal_cents: number
  shipping_cents?: number | null
  coupon_code?: string | null
  card_used_id: string
  channel: Channel
  source?: 'wallet' | 'scan'
}

export interface Transaction {
  id: string
  ts: string
  merchant_id: string
  merchant_name: string
  category: string
  channel: Channel
  source: string
  subtotal_cents: number
  shipping_cents: number | null
  coupon_code: string | null
  coupon_savings_cents: number
  amount_cents: number
  card_used_id: string
  best_card_id: string | null
  earned_cents: number
  best_possible_cents: number
  missed_cents: number
  points_earned: number | null
  is_simulated: true
}

export interface TransactionCreateResponse {
  transaction: Transaction
  duplicate: boolean
}

// ---------------------------------------------------------------- missed

export interface MissedResponse {
  window_days: number
  window_label: string
  total_missed_cents: number
  total_earned_cents: number
  total_best_possible_cents: number
  transaction_count: number
  daily: { date: string; missed_cents: number; earned_cents: number; count: number }[]
  by_category: { category: string; category_label: string; missed_cents: number }[]
  recent: Transaction[]
  db_mode: string
  is_demo_data: true
}

// ---------------------------------------------------------------- cart

export interface CartItem {
  name: string
  qty: number
  price_cents: number
}

export interface ParsedCart {
  merchant_name: string
  merchant_id: string | null
  category: string
  items: CartItem[]
  subtotal_cents: number
  shipping_cents: number | null
}

export interface CartParseResponse {
  source: 'gemini' | 'sample'
  is_sample: boolean
  warning: string | null
  cart: ParsedCart
  stack: StackResponse
}

// ---------------------------------------------------------------- health

export interface HealthResponse {
  status: 'ok'
  db_mode: string
  gemini_configured: boolean
  version: string
}
