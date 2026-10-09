import { useEffect, useRef, useState } from "react";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current;
    let start: number | undefined;
    let frame = 0;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / 850, 1);
      const next = from + (value - from) * (1 - (1 - progress) ** 3);
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span aria-label={dollars.format(value)}>
      <span aria-hidden="true">{dollars.format(display)}</span>
    </span>
  );
}
