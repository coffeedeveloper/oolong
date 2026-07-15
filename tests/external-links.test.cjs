const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeExternalUrl } = require("../electron/external-links.cjs");

test("allows only HTTP and HTTPS external links", () => {
  assert.equal(normalizeExternalUrl("https://example.com/docs"), "https://example.com/docs");
  assert.equal(normalizeExternalUrl("http://example.com"), "http://example.com/");
  assert.equal(normalizeExternalUrl("javascript:alert(1)"), null);
  assert.equal(normalizeExternalUrl("file:///tmp/data"), null);
  assert.equal(normalizeExternalUrl("dict://word"), null);
  assert.equal(normalizeExternalUrl("not a URL"), null);
});

test("rejects oversized external links", () => {
  assert.equal(normalizeExternalUrl(`https://example.com/${"a".repeat(2049)}`), null);
});
