// Hold-to-pay beat timings, measured from the press (PROJECT.md, Interaction 3).
export const HANDSHAKE_MS = 600 // "Reading Card..." starts
export const SUCCESS_MS = 1000 // checkmark, chime, vibration, transaction logged
export const READ_DURATION_MS = SUCCESS_MS - HANDSHAKE_MS
export const RECEIPT_DELAY_MS = 900
