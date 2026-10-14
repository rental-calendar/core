"use client";

import { useEffect, useMemo, useState } from "react";

type Props = { resourceId: string; capacity: number };

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function nightsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (d < stop) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function BookingCalendar({ resourceId, capacity }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch(`/api/availability?resource=${resourceId}&month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (!cancelled) setRemaining(data.remaining);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load availability.");
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, month]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const days: (string | null)[] = Array(first).fill(null);
    for (let i = 1; i <= count; i++) {
      days.push(`${y}-${String(m).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
    }
    return days;
  }, [month]);

  const nights = start && end ? nightsBetween(start, end) : [];
  const maxQty = nights.length
    ? Math.min(...nights.map((d) => remaining[d] ?? capacity))
    : 0;

  function pick(day: string) {
    if (day < today || (remaining[day] ?? 1) === 0) return;
    if (!start || end) {
      setStart(day);
      setEnd(null);
    } else if (day > start) {
      setEnd(day);
    } else {
      setStart(day);
    }
    setQuantity(1);
    setResult(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;
    setSubmitting(true);
    setResult(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_id: resourceId,
        start_date: start,
        end_date: end,
        quantity,
        customer_name: name,
        customer_email: email,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setResult({ ok: true, text: "Booked. A confirmation email is on its way." });
      setStart(null);
      setEnd(null);
      setName("");
      setEmail("");
      const r = await fetch(`/api/availability?resource=${resourceId}&month=${month}`);
      if (r.ok) setRemaining((await r.json()).remaining);
    } else if (res.status === 409) {
      setResult({ ok: false, text: "Sorry, those dates were just taken. Pick different dates." });
      setStart(null);
      setEnd(null);
    } else {
      setResult({ ok: false, text: "Booking failed. Please try again." });
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_280px]">
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="rounded px-3 py-1 hover:bg-gray-100">
            &larr;
          </button>
          <span className="font-medium">{monthLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="rounded px-3 py-1 hover:bg-gray-100">
            &rarr;
          </button>
        </div>
        {loadError && <p className="mb-2 text-sm text-red-700">{loadError}</p>}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} />;
            const left = remaining[day];
            const past = day < today;
            const full = left === 0;
            const inRange = start && end ? day >= start && day < end : day === start;
            const disabled = past || full || left === undefined;
            return (
              <button
                key={day}
                disabled={disabled}
                onClick={() => pick(day)}
                className={[
                  "flex h-14 flex-col items-center justify-center rounded text-sm",
                  past || full ? "text-gray-300" : "hover:bg-gray-100",
                  inRange ? "bg-gray-900 text-white hover:bg-gray-800" : "",
                ].join(" ")}
              >
                <span>{Number(day.slice(8))}</span>
                {!past && left !== undefined && (
                  <span className={inRange ? "text-[10px] text-gray-200" : "text-[10px] text-gray-500"}>
                    {full ? "booked" : `${left} left`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500">Click a start date, then a checkout date. The checkout day is not charged a night.</p>
      </div>

      <aside className="rounded-lg border bg-white p-4">
        {!start && <p className="text-sm text-gray-600">Select dates to book.</p>}
        {start && !end && <p className="text-sm text-gray-600">Start: {start}. Now pick a checkout date.</p>}
        {start && end && (
          <form onSubmit={submit} className="space-y-3">
            <div className="text-sm">
              <div>
                {start} to {end}
              </div>
              <div className="text-gray-500">
                {nights.length} night{nights.length === 1 ? "" : "s"}
              </div>
            </div>
            <label className="block text-sm">
              Quantity
              <input
                type="number"
                min={1}
                max={Math.max(maxQty, 1)}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded border px-2 py-1"
              />
              <span className="text-xs text-gray-500">Up to {maxQty} available for these dates</span>
            </label>
            <label className="block text-sm">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || quantity < 1 || quantity > maxQty}
              className="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {submitting ? "Booking..." : "Book now"}
            </button>
          </form>
        )}
        {result && (
          <p className={`mt-3 text-sm ${result.ok ? "text-green-800" : "text-red-700"}`}>{result.text}</p>
        )}
      </aside>
    </div>
  );
}
