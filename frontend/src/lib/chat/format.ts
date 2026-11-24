/**
 * Deterministic Arabic time/duration formatting for chat messages.
 * Deliberately avoids Intl locale output so digits stay Western and the
 * rendered string is identical on the server and in the browser.
 */
export function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "م" : "ص";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
}

export function formatDuration(durationMs?: number | null): string | null {
  if (durationMs === null || durationMs === undefined || Number.isNaN(Number(durationMs))) {
    return null;
  }
  return `${(Number(durationMs) / 1000).toFixed(2)} ث`;
}
