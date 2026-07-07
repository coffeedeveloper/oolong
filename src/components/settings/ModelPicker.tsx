import { useState } from "react";
import { customModelValue } from "../../config/providerModels";
import type { ModelOption } from "../../config/providerModels";
import { getUiText } from "../../i18n";

export function ModelPicker({
  value,
  options,
  text,
  onChange
}: {
  value: string;
  options: ModelOption[];
  text: ReturnType<typeof getUiText>;
  onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(
    Boolean(value) && !options.some((option) => option.value === value)
  );
  const isKnownValue = options.some((option) => option.value === value);
  const selectValue = customMode || (value && !isKnownValue) ? customModelValue : value || "";

  return (
    <div className="model-picker">
      <select
        value={selectValue}
        onChange={(event) => {
          if (event.target.value === customModelValue) {
            setCustomMode(true);
            return;
          }

          setCustomMode(false);
          onChange(event.target.value);
        }}
      >
        <option value="">{text.provider.defaultValue}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={customModelValue}>{text.provider.customModel}</option>
      </select>

      {selectValue === customModelValue ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={text.provider.customModelPlaceholder}
        />
      ) : null}
    </div>
  );
}
