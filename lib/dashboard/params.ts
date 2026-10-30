export type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Next.js searchParams values can be arrays; take the first value. */
export function firstParam(
  params: SearchParamsRecord,
  key: string,
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parsePage(params: SearchParamsRecord) {
  const raw = Number(firstParam(params, "page"));
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

export function parseSort<T extends string>(
  params: SearchParamsRecord,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = firstParam(params, "sort");
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Builds a query string from the current params plus overrides. */
export function buildQuery(
  params: SearchParamsRecord,
  overrides: Record<string, string | number | undefined | null> = {},
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const first = firstParam({ [key]: value }, key);
    if (first) search.set(key, first);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === "") search.delete(key);
    else search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** True when any of the given keys carries a non-default value. */
export function hasActiveFilters(
  params: SearchParamsRecord,
  defaults: Record<string, string>,
) {
  return Object.entries(defaults).some(([key, fallback]) => {
    const value = firstParam(params, key);
    return value !== undefined && value !== "" && value !== fallback;
  });
}
