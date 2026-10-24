import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationService } from "../../services";
import { NotificationsMenu } from "./NotificationsMenu";

vi.mock("../../services", () => ({ notificationService: { list: vi.fn() } }));

const items = [
  { id: "1", type: "x", message: "Order shipped", createdAt: "2026-01-02T00:00:00Z" },
  { id: "2", type: "x", message: "Order confirmed", createdAt: "2026-01-01T00:00:00Z" },
];

describe("NotificationsMenu", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(notificationService.list).mockResolvedValue(items);
  });

  it("shows an unread count, then clears it and lists messages when opened", async () => {
    render(<NotificationsMenu />);
    const button = await screen.findByRole("button", { name: "Notifications (2 new)" });
    await userEvent.click(button);
    expect(await screen.findByText("Order shipped")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
  });

  it("shows an empty state", async () => {
    vi.mocked(notificationService.list).mockResolvedValue([]);
    render(<NotificationsMenu />);
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
  });
});
