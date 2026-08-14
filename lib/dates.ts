export type DayGroup<T> = { label: string; items: T[] };

const UNDATED_LABEL = "In precedenza";

const shortDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
});

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date, now: Date): string {
  if (dayKey(date) === dayKey(now)) return "Oggi";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return "Ieri";

  // Intl adds a trailing dot to the abbreviated month in it-IT ("11 ago").
  return shortDate.format(date).replace(".", "");
}

/**
 * Groups items by calendar day, preserving the order in which groups and items
 * first appear. Items without a date land in a single trailing group.
 */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => Date | null,
  now: Date = new Date()
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const byKey = new Map<string, DayGroup<T>>();

  for (const item of items) {
    const date = getDate(item);
    const key = date ? dayKey(date) : UNDATED_LABEL;

    let group = byKey.get(key);
    if (!group) {
      group = { label: date ? dayLabel(date, now) : UNDATED_LABEL, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  // Undated items belong at the end regardless of where they appeared.
  const undated = byKey.get(UNDATED_LABEL);
  if (undated && groups.at(-1) !== undated) {
    groups.splice(groups.indexOf(undated), 1);
    groups.push(undated);
  }

  return groups;
}
