import { describe, expect, it } from "vitest";

import { renderField } from "../../src/renderers/layout.js";

describe("renderField", () => {
  it("renders a simple label-value pair and omits empty values", () => {
    expect(renderField("Country", "Germany")).toBe(
      '<span><span class="field-label">Country:</span> Germany</span>',
    );
    expect(renderField("Country", "")).toBe("");
  });
});
