import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IconName } from "../../common/enums";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders a decorative svg of the requested size", () => {
    const { container } = render(<Icon name={IconName.Cart} size={20} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-icon", "cart");
  });

  it("defaults to 16px", () => {
    const { container } = render(<Icon name={IconName.Box} />);
    expect(container.querySelector("svg")).toHaveAttribute("height", "16");
  });
});
