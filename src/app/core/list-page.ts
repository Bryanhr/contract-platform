/** Read a 1-based list page from a query param. */
export function readListPage(value: string | null | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/** Query params to keep a list page across edit → back (omit page 1). */
export function listPageQuery(page: number): { page: number } | Record<string, never> {
  return page > 1 ? { page } : {};
}
