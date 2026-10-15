// Customer-facing dates use the same Monday-exclusive window as the settlement service.
export function scheduledRewardPayment(completedAt: string): string {
  const completed = new Date(completedAt);
  const monday = Date.UTC(completed.getUTCFullYear(), completed.getUTCMonth(), completed.getUTCDate() - (completed.getUTCDay() + 6) % 7);
  return new Date(monday + 8 * 86400000 + 9 * 3600000).toISOString();
}

export function localRewardTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}
