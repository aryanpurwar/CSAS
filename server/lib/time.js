// Calendar-day keys computed in the user's own time zone, so a streak day in
// India runs midnight-to-midnight IST rather than on the server's UTC clock.
export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function dayKey(date, timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function previousDayKey(key) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Returns the new streak state after a qualifying training activity at `now`.
export function nextStreak({ count = 0, best = 0, lastDay = null } = {}, now, timeZone) {
  const today = dayKey(now, timeZone);
  if (lastDay === today) return { count, best: Math.max(best, count), lastDay };
  const newCount = lastDay === previousDayKey(today) ? count + 1 : 1;
  return { count: newCount, best: Math.max(best, newCount), lastDay: today };
}

// Streak shown to the user: if they missed yesterday, it has already lapsed.
export function displayStreak({ count = 0, lastDay = null } = {}, now, timeZone) {
  if (!lastDay) return 0;
  const today = dayKey(now, timeZone);
  return lastDay === today || lastDay === previousDayKey(today) ? count : 0;
}
