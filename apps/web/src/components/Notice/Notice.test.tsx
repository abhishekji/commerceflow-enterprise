import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NoticeProvider, useNotice } from "../../context/NoticeContext";
import { Notice } from "./Notice";

function Trigger() {
  const { showNotice } = useNotice();
  return <button onClick={() => showNotice("Hello there")}>show</button>;
}

describe("Notice", () => {
  it("renders nothing until a notice is shown, then can be dismissed", async () => {
    render(<NoticeProvider><Trigger /><Notice /></NoticeProvider>);
    expect(screen.queryByRole("status")).toBeNull();

    await act(async () => userEvent.click(screen.getByText("show")));
    expect(screen.getByRole("status")).toHaveTextContent("Hello there");

    await act(async () => userEvent.click(screen.getByLabelText("Dismiss notification")));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
