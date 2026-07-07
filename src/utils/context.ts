export function createContextId() {
  return `context-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
