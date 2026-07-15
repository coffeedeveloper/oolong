const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createJsonStore } = require("../electron/store.cjs");

function normalize(value = {}) {
  return {
    settings: value.settings ?? { language: "en" },
    history: Array.isArray(value.history) ? value.history : []
  };
}

test("serializes concurrent updates without losing data", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oolong-store-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "store.json");
  const store = createJsonStore({ getFilePath: () => filePath, normalize });

  const first = store.update(async (current) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    current.history.push({ id: "first" });
  });
  const second = store.update((current) => {
    current.history.push({ id: "second" });
  });

  await Promise.all([first, second]);
  assert.deepEqual(
    (await store.read()).history.map((entry) => entry.id),
    ["first", "second"]
  );
  assert.deepEqual(
    (await fs.readdir(directory)).filter((name) => name.endsWith(".tmp")),
    []
  );
});

test("continues processing after a failed mutation", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "oolong-store-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = createJsonStore({
    getFilePath: () => path.join(directory, "store.json"),
    normalize,
    onReadError: () => undefined
  });

  await assert.rejects(
    store.update(() => {
      throw new Error("failed mutation");
    }),
    /failed mutation/
  );
  await store.update((current) => {
    current.settings.language = "zh";
  });

  assert.equal((await store.read()).settings.language, "zh");
});
