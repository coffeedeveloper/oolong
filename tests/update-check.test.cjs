const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createUpdateChecker,
  isNewerVersion,
  parseVersion
} = require("../electron/update-check.cjs");

test("parses release tags and compares semantic versions", () => {
  assert.deepEqual(parseVersion("v1.2.3"), {
    version: "1.2.3",
    parts: [1, 2, 3],
    prerelease: false
  });
  assert.equal(parseVersion("latest"), null);
  assert.equal(isNewerVersion(parseVersion("1.3.0"), parseVersion("1.2.9")), true);
  assert.equal(isNewerVersion(parseVersion("1.2.3"), parseVersion("1.2.3")), false);
  assert.equal(isNewerVersion(parseVersion("1.2.3"), parseVersion("1.2.3-beta.1")), true);
});

test("returns a newer packaged release and caches the request", async () => {
  let requests = 0;
  const checker = createUpdateChecker({
    app: { isPackaged: true, getVersion: () => "1.2.3" },
    net: {
      async fetch() {
        requests += 1;
        return {
          ok: true,
          async json() {
            return { tag_name: "v1.3.0" };
          }
        };
      }
    }
  });

  assert.deepEqual(await checker.checkForUpdates(), { version: "1.3.0" });
  assert.deepEqual(await checker.checkForUpdates(), { version: "1.3.0" });
  assert.equal(requests, 1);
});

test("skips network checks outside packaged builds", async () => {
  const checker = createUpdateChecker({
    app: { isPackaged: false, getVersion: () => "1.0.0" },
    net: {
      fetch() {
        throw new Error("fetch should not run");
      }
    }
  });

  assert.equal(await checker.checkForUpdates(), null);
});
