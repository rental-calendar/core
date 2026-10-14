export type BookingRange = { start_date: string; end_date: string; quantity: number };

export function remainingByDay(
  capacity: number,
  days: string[],
  bookings: BookingRange[],
  blocked: Set<string>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const day of days) {
    if (blocked.has(day)) {
      result[day] = 0;
      continue;
    }
    const booked = bookings
      .filter((b) => day >= b.start_date && day < b.end_date)
      .reduce((sum, b) => sum + b.quantity, 0);
    result[day] = Math.max(0, capacity - booked);
  }
  return result;
}

export function daysInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    return `${y}-${String(m).padStart(2, "0")}-${d}`;
  });
}
