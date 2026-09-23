/**
 * Returns the number of trackable sets in a prescription.
 * For ranges (for example, `2–3`) the tracker exposes the upper bound so the
 * athlete can confirm every set they may perform. Non-numeric prescriptions
 * such as rehabilitation instructions intentionally have no tracker.
 */
export function plannedSetCount(prescription: string): number {
  const values = [...prescription.matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (!values.length) return 0;
  return Math.max(0, Math.max(...values));
}
