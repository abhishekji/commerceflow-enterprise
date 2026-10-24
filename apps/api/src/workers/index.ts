import { createMessageBus } from "../messaging/message-bus.js";
import { publishPendingEvents } from "../messaging/outbox-publisher.js";
import { handleDomainMessage } from "../modules/fulfillment/event-handlers.js";

const POLL_INTERVAL_MS = 1500;

export function startWorkers() {
  const bus = createMessageBus();
  bus.start(handleDomainMessage);

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const tick = async () => {
    try {
      await publishPendingEvents(bus);
    } catch (error) {
      console.error("Outbox publisher failed", error);
    }
    if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
  };
  void tick();
  console.log(`Background workers started (outbox -> ${bus.kind === "sqs" ? "SQS" : "in-process queue"})`);

  return async () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    await bus.stop();
  };
}
