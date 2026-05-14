/**
 * Given a desired filename (e.g. `notes.txt`) and a set of names already in
 * use, returns a non-conflicting variant by appending `(1)`, `(2)`, … to the
 * stem — matching browser download behaviour.
 *
 * Compound extensions like `.tar.gz` are not special-cased; only the segment
 * after the final `.` is treated as the extension.
 */
export function uniqueName(desired: string, taken: Set<string>): string {
  if (!taken.has(desired)) return desired;
  const dot = desired.lastIndexOf('.');
  const hasExt = dot > 0;
  const stem = hasExt ? desired.slice(0, dot) : desired;
  const ext = hasExt ? desired.slice(dot) : '';
  for (let n = 1; n < 10_000; n += 1) {
    const candidate = `${stem} (${n})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  return desired;
}
