export type ModelOption = {
  value: string;
  label: string;
};

export const customModelValue = "__custom__";

export const codexModelOptions: ModelOption[] = [
  { value: "gpt-5.5", label: "GPT-5.5" },
  { value: "gpt-5.4", label: "GPT-5.4" },
  { value: "gpt-5.4-mini", label: "GPT-5.4 mini" },
  { value: "gpt-5.4-nano", label: "GPT-5.4 nano" }
];

export const claudeModelOptions: ModelOption[] = [
  { value: "claude-fable-5", label: "Claude Fable 5" },
  { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" }
];
