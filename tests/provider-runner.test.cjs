const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  applyProxyEnv,
  historyPreview,
  makePrompt,
  mergePathEntries,
  providerCommand
} = require("../electron/provider-runner.cjs");

test("builds restrictive Codex arguments", () => {
  const result = providerCommand(
    {
      provider: "codex",
      codexExecutable: "codex",
      codexModel: "gpt-5.6-sol",
      codexReasoningEffort: "high",
      codexProfile: "work"
    },
    "prompt"
  );

  assert.equal(result.command, "codex");
  assert.deepEqual(result.args, [
    "exec",
    "--skip-git-repo-check",
    "-c",
    'model_reasoning_effort="high"',
    "--model",
    "gpt-5.6-sol",
    "--profile",
    "work",
    "--ephemeral",
    "--color",
    "never",
    "-"
  ]);
  assert.equal(result.stdin, "prompt");
});

test("builds Claude arguments without shell interpolation", () => {
  const result = providerCommand(
    {
      provider: "claude",
      claudeExecutable: "claude",
      claudeModel: "claude-sonnet-5"
    },
    "translate this"
  );

  assert.deepEqual(result, {
    command: "claude",
    args: ["-p", "--model", "claude-sonnet-5", "translate this"],
    stdin: null
  });
});

test("builds trusted read-only Cursor print arguments with plain text output", () => {
  const result = providerCommand(
    {
      provider: "cursor",
      cursorExecutable: "agent",
      cursorModel: ""
    },
    "translate this"
  );

  assert.deepEqual(result, {
    command: "agent",
    args: [
      "-p",
      "--trust",
      "--mode",
      "ask",
      "--output-format",
      "text",
      "translate this"
    ],
    stdin: null
  });
  assert.equal(result.args.includes("--force"), false);
  assert.equal(result.args.includes("--yolo"), false);
  assert.equal(result.args.includes("-f"), false);
});

test("adds only the configured Cursor model argument", () => {
  const result = providerCommand(
    {
      provider: "cursor",
      cursorExecutable: "agent",
      cursorModel: "custom-model"
    },
    "translate this"
  );

  assert.deepEqual(result.args, [
    "-p",
    "--trust",
    "--mode",
    "ask",
    "--output-format",
    "text",
    "--model",
    "custom-model",
    "translate this"
  ]);
});

test("applies proxy variables in both common casings", () => {
  const env = applyProxyEnv(
    {},
    {
      proxyEnabled: true,
      httpProxy: "http://127.0.0.1:7890",
      allProxy: "socks5://127.0.0.1:7890"
    }
  );

  assert.equal(env.http_proxy, "http://127.0.0.1:7890");
  assert.equal(env.HTTPS_PROXY, "http://127.0.0.1:7890");
  assert.equal(env.ALL_PROXY, "socks5://127.0.0.1:7890");
});

test("merges PATH entries without empty or duplicate values", () => {
  const delimiter = path.delimiter;

  assert.equal(
    mergePathEntries([`/usr/bin${delimiter}${delimiter}/bin`, "/usr/bin", "/opt/bin"]),
    ["/usr/bin", "/bin", "/opt/bin"].join(delimiter)
  );
});

test("formats prompts and bounded history previews", () => {
  assert.equal(
    makePrompt({ context: { prompt: "  Translate accurately.  " }, input: "hello" }),
    "Translate accurately.\n\nUser text:\nhello"
  );
  assert.equal(historyPreview(`  ${"word ".repeat(50)} `).length, 140);
});
