/** Upper stock identity owns its standard item and lower-stock variants. */
export function groupProducts<T extends { uStokId: number; aStokId: number }>(items: readonly T[]) {
  const groups = new Map<number, T[]>();
  for (const item of items) {
    const group = groups.get(item.uStokId) ?? [];
    group.push(item);
    groups.set(item.uStokId, group);
  }
  return [...groups.entries()].map(([uStokId, lines]) => ({
    uStokId,
    lines: lines.slice().sort((a, b) => a.aStokId - b.aStokId),
  }));
}

/** Each upper/lower stock pair stays an independently visible product row. */
export function separateProducts<T extends { uStokId: number; aStokId: number }>(items: readonly T[]) {
  return groupProducts(items).flatMap(group => group.lines);
}
