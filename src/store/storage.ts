// Keep compatible demo records when the application storage namespace changes.
// The new namespace takes precedence; only a validated prior value is migrated.
export function readStoredValue(key: string, suffix: string, accepts: (value: string) => boolean): string | null {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  for (const previousKey of Object.keys(localStorage)) {
    if (!previousKey.endsWith(suffix) || previousKey === key) continue;
    const value = localStorage.getItem(previousKey);
    if (value === null) continue;
    try {
      if (!accepts(value)) continue;
      localStorage.setItem(key, value);
      localStorage.removeItem(previousKey);
      return value;
    } catch { /* Retain the prior value if validation or persistence fails. */ }
  }
  return null;
}
