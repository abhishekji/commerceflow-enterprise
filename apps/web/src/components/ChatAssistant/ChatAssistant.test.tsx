import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { aiService } from "../../services";
import { ChatAssistant } from "./ChatAssistant";

vi.mock("../../services", () => ({ aiService: { chat: vi.fn() } }));

describe("ChatAssistant", () => {
  it("sends the conversation and shows the reply", async () => {
    vi.mocked(aiService.chat).mockResolvedValue({ reply: "We have 10 widgets." });
    const user = userEvent.setup();
    render(<ChatAssistant />);

    await user.click(screen.getByRole("button", { name: "Open AI assistant" }));
    await user.type(screen.getByLabelText("Message"), "Widget stock?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("We have 10 widgets.")).toBeInTheDocument();
    expect(aiService.chat).toHaveBeenCalledWith([{ role: "user", content: "Widget stock?" }]);
  });

  it("shows a friendly error when the assistant is not configured", async () => {
    vi.mocked(aiService.chat).mockRejectedValue({ status: 503, code: "AI_NOT_CONFIGURED" });
    const user = userEvent.setup();
    render(<ChatAssistant />);

    await user.click(screen.getByRole("button", { name: "Open AI assistant" }));
    await user.type(screen.getByLabelText("Message"), "Hi");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("isn't configured");
  });
});
