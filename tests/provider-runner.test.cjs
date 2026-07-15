const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyProxyEnv,
  historyPreview,
  makePrompt,
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

test("formats prompts and bounded history previews", () => {
  assert.equal(
    makePrompt({ context: { prompt: "  Translate accurately.  " }, input: "hello" }),
    "Translate accurately.\n\nUser text:\nhello"
  );
  assert.equal(historyPreview(`  ${"word ".repeat(50)} `).length, 140);
});
