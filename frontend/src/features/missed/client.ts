import type { MissedLoader } from "./types";

// Relative URL works with Omar's Vite /api proxy. The screen also accepts the
// shared api.ts loader, so this helper need not become a second shared client.
export const fetchMissed: MissedLoader = async (signal) => {
  const response = await fetch("/api/missed", { signal, cache: "no-store" });
  if (!response.ok) {
    throw new Error("Your history could not be loaded. Please try again.");
  }
  return response.json();
};
