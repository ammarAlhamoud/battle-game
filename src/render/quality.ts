/** Presentation preference only: never part of an authoritative battle snapshot. */
export type GraphicsQuality = 'high' | 'adaptive';
const listeners = new Set<(quality: GraphicsQuality) => void>();
const KEY = 'eightfold.graphics-quality';
let preference: GraphicsQuality | undefined;

export function getGraphicsQuality(): GraphicsQuality {
  if (preference) return preference;
  try { preference = localStorage.getItem(KEY) === 'adaptive' ? 'adaptive' : 'high'; }
  catch { preference = 'high'; }
  return preference;
}

export function setGraphicsQuality(quality: GraphicsQuality): void {
  preference = quality;
  try { localStorage.setItem(KEY, quality); } catch { /* The current session still works when storage is unavailable. */ }
  for (const listener of listeners) listener(quality);
}

export function observeGraphicsQuality(listener: (quality: GraphicsQuality) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
