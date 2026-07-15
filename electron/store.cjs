const path = require("node:path");
const fs = require("node:fs/promises");

function createJsonStore({ getFilePath, normalize, onReadError = console.warn }) {
  let mutationQueue = Promise.resolve();
  let temporaryFileCounter = 0;

  async function readFile() {
    const filePath = getFilePath();
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return normalize(JSON.parse(raw));
    } catch (error) {
      if (error && error.code !== "ENOENT") {
        onReadError("Failed to read store:", error);
      }
      return normalize();
    }
  }

  async function writeFile(value) {
    const filePath = getFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const normalized = normalize(value);
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${temporaryFileCounter}.tmp`;
    temporaryFileCounter += 1;

    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.unlink(temporaryPath).catch(() => undefined);
      throw error;
    }

    return normalized;
  }

  async function read() {
    await mutationQueue;
    return readFile();
  }

  function update(mutator) {
    const operation = mutationQueue.then(async () => {
      const current = await readFile();
      const result = await mutator(current);
      const stored = await writeFile(current);
      return result === undefined ? stored : result;
    });

    mutationQueue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }

  return { read, update };
}

module.exports = { createJsonStore };
