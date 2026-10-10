// One line under the store chip: what the location check found, or why it could not.

import type { DetectionStatus, StoreDetection } from '../../location'

const MESSAGES: Record<Exclude<DetectionStatus, 'detected'>, string> = {
  locating: 'Checking your location…',
  matching: "Finding the store you're in…",
  no_store: 'No demo store is near you. Pick one to simulate arriving.',
  low_accuracy: "Your location isn't precise enough to tell which store you're in.",
  denied: "Location access is off, so your store can't be detected. Allow it in your browser settings, or pick a store.",
  insecure: 'Browsers only share location over HTTPS or localhost. Pick a store to simulate arriving.',
  unavailable: "Couldn't get a location fix. Pick a store to simulate arriving.",
  error: "Couldn't match your location to a store. Pick one to simulate arriving.",
}

interface Props {
  detection: StoreDetection
  /** Metres from the store when the card deck is showing an auto-detected store; otherwise null. */
  detectedDistanceM: number | null
  /** True when any store (detected or picked) is currently lifted. */
  located: boolean
}

export function DetectionNotice({ detection, detectedDistanceM, located }: Props) {
  const { status, location, recheck } = detection
  const inFlight = status === 'locating' || status === 'matching'

  let text: string | null = null
  if (detectedDistanceM !== null) {
    text = `Detected from your location${detectedDistanceM > 0 ? ` · ${detectedDistanceM} m away` : ''}`
  } else if (!located) {
    text = status === 'detected' ? (location ? `You're near ${location.merchant.name}.` : null) : MESSAGES[status]
  }
  if (!text) return null

  return (
    <p role="status" className="-mt-2 mb-4 text-[13px] text-white/50">
      {text}
      {!inFlight && detectedDistanceM === null && (
        <button type="button" onClick={recheck} className="ml-2 font-medium text-white/75 underline underline-offset-2 hover:text-white">
          Check again
        </button>
      )}
    </p>
  )
}
