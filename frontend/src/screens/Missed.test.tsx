import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Missed from "./Missed";
import { sampleSummary } from "../../ayman-tests/fixtures";
import { fetchMissed } from "../features/missed/client";

describe("Missed", () => {
  it("shows the total, used/best choices, and the zero-loss purchase", async () => {
    render(<Missed loadMissed={async () => sampleSummary} />);
    expect(await screen.findByLabelText("$42.50")).toBeTruthy();
    expect(screen.getByText("$3.06 missed")).toBeTruthy();
    expect(screen.getByText("Amex Gold")).toBeTruthy();
    expect(screen.getByText("Maximized")).toBeTruthy();
    expect(screen.getByText("Earned $0.00 of $2.55 possible")).toBeTruthy();
  });

  it("shows loading before history arrives", async () => {
    let resolve: (value: typeof sampleSummary) => void = () => {};
    const pending = new Promise<typeof sampleSummary>((done) => { resolve = done; });
    render(<Missed loadMissed={() => pending} />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    await act(async () => resolve(sampleSummary));
    expect(screen.queryByText("Loading your simulated purchases…")).toBeNull();
  });

  it("retries a failed load", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(sampleSummary);
    render(<Missed loadMissed={load} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("$42.50")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps existing data visible when a refresh fails", async () => {
    const load = vi.fn().mockResolvedValueOnce(sampleSummary).mockRejectedValue(new Error("offline"));
    render(<Missed loadMissed={load} />);
    await screen.findByLabelText("$42.50");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("$42.50")).toBeTruthy();
  });

  it("explains empty history", async () => {
    const empty = { ...sampleSummary, total_missed: 0, total_earned: 0, best_possible: 0, transaction_count: 0, transactions: [], by_category: [] };
    render(<Missed loadMissed={async () => empty} />);
    expect(await screen.findByText("A fresh start")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("reloads when the shell changes refreshKey and ignores an obsolete response", async () => {
    let obsolete: (value: typeof sampleSummary) => void = () => {};
    const pending = new Promise<typeof sampleSummary>((resolve) => { obsolete = resolve; });
    const fresh = { ...sampleSummary, total_missed: 50 };
    const load = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(fresh);
    const { rerender } = render(<Missed loadMissed={load} refreshKey={0} />);
    rerender(<Missed loadMissed={load} refreshKey={1} />);
    await screen.findByLabelText("$50.00");
    await act(async () => obsolete(sampleSummary));
    expect(screen.getByLabelText("$50.00")).toBeTruthy();
  });

  it("refreshes on a transaction notification", async () => {
    const load = vi.fn().mockResolvedValue(sampleSummary);
    render(<Missed loadMissed={load} />);
    await screen.findByLabelText("$42.50");
    act(() => window.dispatchEvent(new Event("transactions:changed")));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it("provides keyboard-accessible daily values", async () => {
    render(<Missed loadMissed={async () => sampleSummary} />);
    await screen.findByLabelText("$42.50");
    fireEvent.click(screen.getByText("Explore daily totals"));
    fireEvent.change(screen.getByLabelText("Choose a day"), { target: { value: "2026-09-09" } });
    expect(screen.getByRole("status").textContent).toContain("$1.70 missed across 1 simulated purchases");
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("cancels pending requests on unmount", () => {
    const load = vi.fn((_signal: AbortSignal) => new Promise<typeof sampleSummary>(() => {}));
    const { unmount } = render(<Missed loadMissed={load} />);
    const signal = load.mock.calls[0][0] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe("feature fetch helper", () => {
  it("requests the agreed endpoint and rejects failed responses", async () => {
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unavailable", { status: 503 }));
    const signal = new AbortController().signal;
    await expect(fetchMissed(signal)).rejects.toThrow("could not be loaded");
    expect(mock).toHaveBeenCalledWith("/api/missed", { signal, cache: "no-store" });
  });
});
