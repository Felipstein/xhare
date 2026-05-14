/**
 * Shared grid template for every row in the feed.
 * Keeping this constant ensures every row has perfectly aligned columns,
 * regardless of state (idle / sending / receiving / error / hover).
 *
 * Columns:
 *   1. Icon (40px)
 *   2. Name + subtitle (flex)
 *   3. Size (right, 70px) — empty for folders
 *   4. Sender ("de: device" / "↑ você") (140px)
 *   5. Time ago (right, 80px)
 *   6. Status slot (right, 130px) — progress bar / error badge
 */
export const ROW_GRID = 'grid-cols-[40px_minmax(0,1fr)_70px_140px_80px_130px]';
