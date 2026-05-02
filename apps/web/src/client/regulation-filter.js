// Regulation browse visibility policy.
// The JSON/MD sources are authoritative; the browse tab should not silently hide chapters.

export const REGULATION_HIDDEN_CHAPTERS = {};

export function getVisibleRegulationChapters(chapters, hiddenChapters = REGULATION_HIDDEN_CHAPTERS) {
  if (!Array.isArray(chapters)) return [];
  return chapters.filter((chapter) => !hiddenChapters[chapter]);
}
