import { useEffect, useState } from "react";
import { fetchMissed } from "../features/missed/client";
import { CountUp } from "../features/missed/CountUp";
import { DailyChart } from "../features/missed/DailyChart";
import type { MissedLoader, MissedSummary } from "../features/missed/types";
import "../features/missed/missed.css";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface MissedProps {
  loadMissed?: MissedLoader;
  // Increment after Wallet/Scan logs a purchase if tabs remain mounted.
  refreshKey?: number;
}

export default function Missed({ loadMissed = fetchMissed, refreshKey = 0 }: MissedProps) {
  const [summary, setSummary] = useState<MissedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((previous) => previous + 1);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("transactions:changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("transactions:changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loadMissed(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSummary(data); })
      .catch(() => {
        if (!controller.signal.aborted) setError("We couldn’t refresh your history. Try again.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [loadMissed, refreshKey, revision]);

  return (
    <section className="missed-screen" aria-labelledby="missed-title" aria-busy={loading}>
      <header className="missed-header">
        <div><p className="missed-eyebrow">EVERY CARD COUNTS</p><h1 id="missed-title">Cash back missed</h1></div>
        <button className="missed-refresh" onClick={() => setRevision((previous) => previous + 1)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>
      <p className="missed-intro">Small choices. Real potential.</p>
      {error && <div className="missed-error" role="alert"><p>{error}</p><button onClick={() => setRevision((previous) => previous + 1)}>Try again</button></div>}
      {!summary && loading && <p className="missed-loading" role="status">Loading your simulated purchases…</p>}
      {summary && <>
        <div className="missed-hero">
          <p>You could have earned</p>
          <div className="missed-total"><CountUp value={summary.total_missed} /></div>
          <p>more in cash back over the last 30 days</p>
          <div className="missed-hero-footnote">From {summary.transaction_count} simulated purchases</div>
        </div>
        <div className="missed-stats">
          <div><span>Value earned</span><strong>{dollars.format(summary.total_earned)}</strong></div>
          <div><span>Best possible</span><strong>{dollars.format(summary.best_possible)}</strong></div>
        </div>
        {summary.transaction_count === 0 ? (
          <div className="missed-empty"><h2>A fresh start</h2><p>Make a simulated purchase in Wallet or Scan to see how your card choice adds up.</p></div>
        ) : <>
          <DailyChart daily={summary.daily} />
          {summary.by_category.length > 0 && (
            <section className="missed-categories" aria-labelledby="missed-category-heading">
              <h2 id="missed-category-heading">Where it adds up</h2>
              <ul>{summary.by_category.map((category) => <li key={category.category}><span>{category.category.replaceAll("_", " ")}</span><strong>{dollars.format(category.missed)}</strong></li>)}</ul>
            </section>
          )}
          <section className="missed-history" aria-labelledby="missed-history-heading">
            <div className="missed-section-heading"><h2 id="missed-history-heading">Recent purchases</h2><span>{summary.transactions.length} shown</span></div>
            <ul>
              {summary.transactions.map((transaction) => (
                <li className="missed-transaction" key={transaction.id}>
                  <div className="missed-transaction-top">
                    <h3>{transaction.merchant}</h3>
                    <strong className={transaction.missed > 0 ? "missed-loss" : "missed-optimal"}>
                      {transaction.missed > 0 ? `${dollars.format(transaction.missed)} missed` : "Maximized"}
                    </strong>
                  </div>
                  <div className="missed-transaction-meta">
                    <time dateTime={transaction.ts}>{new Date(transaction.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time>
                    <span>· {dollars.format(transaction.amount)} · {transaction.channel === "online" ? "Online" : "In store"}</span>
                  </div>
                  <dl>
                    <div><dt>Used</dt><dd>{transaction.card_used}</dd></div>
                    <div><dt>Best choice</dt><dd>{transaction.best_card}</dd></div>
                  </dl>
                  <p className="missed-reward-comparison">Earned {dollars.format(transaction.earned)} of {dollars.format(transaction.best_possible)} possible</p>
                </li>
              ))}
            </ul>
          </section>
        </>}
        <p className="missed-disclaimer">Simulated purchases and estimated rewards. Daily totals use UTC; the window covers the past 30 × 24 hours.</p>
      </>}
    </section>
  );
}
