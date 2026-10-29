/**
 * Cuts text to at most `lines` lines and ends it with "…" (SC-14 #5).
 * The full text stays in the DOM, so screen readers still read the whole name.
 */
export function clampLines(lines) {
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };
}

// Location names on SC-14 result cards: at most 2 lines (T043, T044)
export const cardNameStyle = clampLines(2);
