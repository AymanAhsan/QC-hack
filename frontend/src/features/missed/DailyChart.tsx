import { useState } from "react";
import type { DailyMissed } from "./types";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(
  "en-US", { month: "short", day: "numeric", timeZone: "UTC" },
);

export function DailyChart({ daily }: { daily: DailyMissed[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selected = daily.find((day) => day.date === selectedDate);
  const max = Math.max(...daily.map((day) => day.missed), 1);
  const width = 320;
  const gap = 3;
  const barWidth = Math.max((width - gap * (daily.length - 1)) / Math.max(daily.length, 1), 1);

  return (
    <section className="missed-chart" aria-labelledby="missed-chart-heading">
      <div className="missed-section-heading">
        <h2 id="missed-chart-heading">A little each day adds up</h2>
        <span>Daily · UTC</span>
      </div>
      <svg viewBox="0 0 320 116" role="img" aria-labelledby="missed-chart-title missed-chart-desc">
        <title id="missed-chart-title">Cash back missed each day</title>
        <desc id="missed-chart-desc">
          The last 30 days, grouped by UTC date. A complete daily breakdown follows the chart.
        </desc>
        <line x1="0" x2="320" y1="112" y2="112" className="missed-chart-baseline" />
        {daily.map((day, index) => {
          const height = day.missed > 0 ? Math.max((day.missed / max) * 102, 3) : 2;
          return (
            <rect
              key={day.date}
              x={index * (barWidth + gap)}
              y={112 - height}
              width={barWidth}
              height={height}
              rx="2"
              className={day.missed > 0 ? "missed-chart-bar" : "missed-chart-zero"}
            >
              <title>{dateLabel(day.date)}: {dollars.format(day.missed)} missed</title>
            </rect>
          );
        })}
      </svg>
      <div className="missed-chart-dates" aria-hidden="true">
        <span>{daily[0] ? dateLabel(daily[0].date) : ""}</span>
        <span>{daily.at(-1) ? dateLabel(daily.at(-1)!.date) : ""}</span>
      </div>
      <details className="missed-daily-details">
        <summary>Explore daily totals</summary>
        <label>
          Choose a day
          <select value={selected?.date ?? ""} onChange={(event) => setSelectedDate(event.target.value)}>
            <option value="">Select a date</option>
            {daily.map((day) => <option key={day.date} value={day.date}>{dateLabel(day.date)}</option>)}
          </select>
        </label>
        {selected && (
          <p role="status">{dollars.format(selected.missed)} missed across {selected.transaction_count} simulated purchases.</p>
        )}
        <table>
          <caption className="missed-sr-only">Daily cash back missed</caption>
          <thead><tr><th scope="col">Day</th><th scope="col">Purchases</th><th scope="col">Missed</th></tr></thead>
          <tbody>
            {daily.map((day) => (
              <tr key={day.date}><th scope="row">{dateLabel(day.date)}</th><td>{day.transaction_count}</td><td>{dollars.format(day.missed)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
