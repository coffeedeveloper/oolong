const test = require("node:test");
const assert = require("node:assert/strict");
const { defaultSettings, normalizeSettings, normalizeStore } = require("../electron/settings.cjs");

test("normalizes settings and clamps numeric limits", () => {
  const settings = normalizeSettings({
    provider: "unknown",
    theme: "neon",
    historyLimit: 999,
    providerTimeoutSeconds: 1,
    codexExecutable: "  /usr/local/bin/codex  ",
    codexReasoningEffort: "invalid"
  });

  assert.equal(settings.provider, "codex");
  assert.equal(settings.theme, defaultSettings.theme);
  assert.equal(settings.historyLimit, 500);
  assert.equal(settings.providerTimeoutSeconds, 10);
  assert.equal(settings.codexExecutable, "/usr/local/bin/codex");
  assert.equal(settings.codexReasoningEffort, defaultSettings.codexReasoningEffort);
});

test("preserves supported themes", () => {
  assert.equal(normalizeSettings({ theme: "cream" }).theme, "cream");
  assert.equal(normalizeSettings({ theme: "light" }).theme, "light");
  assert.equal(normalizeSettings({ theme: "dark" }).theme, "dark");
});

test("deduplicates context IDs and limits context count", () => {
  const contexts = Array.from({ length: 22 }, (_, index) => ({
    id: "duplicate",
    label: `Context ${index + 1}`,
    prompt: `Prompt ${index + 1}`
  }));
  const settings = normalizeSettings({ contexts });

  assert.equal(settings.contexts.length, 20);
  assert.equal(new Set(settings.contexts.map((context) => context.id)).size, 20);
});

test("migrates the legacy system prompt when contexts are absent", () => {
  const settings = normalizeSettings({ systemPrompt: "Use concise wording." });
  assert.match(settings.contexts[0].prompt, /Additional context from the user/);
  assert.match(settings.contexts[0].prompt, /Use concise wording\./);
});

test("normalizes malformed stores without discarding valid history arrays", () => {
  const history = [{ id: "entry-1" }];
  const store = normalizeStore({ settings: null, history });

  assert.equal(store.settings.provider, defaultSettings.provider);
  assert.equal(store.history, history);
});
