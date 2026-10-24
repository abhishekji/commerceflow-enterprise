import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../../src/config/env.js";
import { createMessageBus, type DomainMessage } from "../../../src/messaging/message-bus.js";

const sendMock = vi.hoisted(() => vi.fn());
vi.mock("@aws-sdk/client-sqs", () => {
  const command = (name: string) =>
    class {
      readonly name = name;
      constructor(public input: Record<string, unknown>) {}
    };
  return {
    SQSClient: class {
      send = sendMock;
    },
    SendMessageCommand: command("SendMessage"),
    ReceiveMessageCommand: command("ReceiveMessage"),
    DeleteMessageCommand: command("DeleteMessage"),
  };
});

const message: DomainMessage = {
  eventId: "e1",
  tenantId: "t1",
  aggregateType: "Order",
  aggregateId: "o1",
  eventType: "order.created",
  payload: { customerId: "c1" },
};

describe("local message bus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("is used when no SQS queue is configured", () => {
    expect(createMessageBus().kind).toBe("local");
  });

  it("delivers a published message to the handler asynchronously", async () => {
    const bus = createMessageBus();
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.start(handler);
    await bus.publish(message);
    expect(handler).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(handler).toHaveBeenCalledExactlyOnceWith(message);
  });

  it("retries a failing handler with back-off and then drops the message after 3 attempts", async () => {
    const bus = createMessageBus();
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    bus.start(handler);
    await bus.publish(message);
    await vi.advanceTimersByTimeAsync(0);
    expect(handler).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(handler).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(handler).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(handler).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Dropped order.created"), expect.any(Error));
  });

  it("recovers when a retry succeeds", async () => {
    const bus = createMessageBus();
    const handler = vi.fn().mockRejectedValueOnce(new Error("flaky")).mockResolvedValue(undefined);
    bus.start(handler);
    await bus.publish(message);
    await vi.advanceTimersByTimeAsync(2000);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("does nothing before start() and after stop()", async () => {
    const early = createMessageBus();
    await early.publish(message);
    await vi.advanceTimersByTimeAsync(0);

    const bus = createMessageBus();
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.start(handler);
    await bus.publish(message);
    await bus.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("SQS message bus", () => {
  const original = env.AWS_SQS_QUEUE_URL;
  beforeEach(() => {
    sendMock.mockReset();
    (env as { AWS_SQS_QUEUE_URL?: string }).AWS_SQS_QUEUE_URL = "https://sqs.example/queue";
  });
  afterEach(() => {
    (env as { AWS_SQS_QUEUE_URL?: string }).AWS_SQS_QUEUE_URL = original;
  });

  it("is selected when a queue URL is configured and publishes the message as JSON", async () => {
    sendMock.mockResolvedValue({});
    const bus = createMessageBus();
    expect(bus.kind).toBe("sqs");
    await bus.publish(message);
    const command = sendMock.mock.calls[0]![0] as { input: { QueueUrl: string; MessageBody: string } };
    expect(command.input.QueueUrl).toBe("https://sqs.example/queue");
    expect(JSON.parse(command.input.MessageBody)).toEqual(message);
  });

  it("deletes a message only after the handler succeeds, and leaves failed ones for redelivery", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let release!: () => void;
    let receives = 0;
    sendMock.mockImplementation(async (command: { name: string }) => {
      if (command.name === "ReceiveMessage") {
        receives += 1;
        if (receives === 1) {
          return {
            Messages: [
              { Body: JSON.stringify(message), ReceiptHandle: "ok" },
              { Body: JSON.stringify({ ...message, eventId: "bad" }), ReceiptHandle: "fail" },
            ],
          };
        }
        return new Promise((resolve) => {
          release = () => resolve({});
        });
      }
      return {};
    });
    const handler = vi.fn(async (received: DomainMessage) => {
      if (received.eventId === "bad") throw new Error("handler failed");
    });

    const bus = createMessageBus();
    bus.start(handler);
    await vi.waitFor(() => expect(receives).toBe(2));
    const stopping = bus.stop();
    release();
    await stopping;

    const deletes = sendMock.mock.calls
      .map(([command]) => command as { name: string; input: { ReceiptHandle?: string } })
      .filter((command) => command.name === "DeleteMessage")
      .map((command) => command.input.ReceiptHandle);
    expect(deletes).toEqual(["ok"]);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
