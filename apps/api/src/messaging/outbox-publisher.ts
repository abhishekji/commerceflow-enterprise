import { OutboxEvent } from "../modules/events/outbox-event.model.js";
import type { MessageBus } from "./message-bus.js";

const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 60_000;

/** Claims pending outbox events one at a time and publishes them; safe to run on several instances. */
export async function publishPendingEvents(bus: MessageBus) {
  await OutboxEvent.updateMany(
    { status: "PROCESSING", updatedAt: { $lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
    { $set: { status: "PENDING" } },
  );

  let published = 0;
  for (;;) {
    const event = await OutboxEvent.findOneAndUpdate(
      { status: "PENDING", availableAt: { $lte: new Date() } },
      { $set: { status: "PROCESSING" }, $inc: { attempts: 1 } },
      { sort: { createdAt: 1 }, returnDocument: "after" },
    );
    if (!event) break;

    try {
      await bus.publish({
        eventId: event.eventId,
        tenantId: event.tenantId.toString(),
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId.toString(),
        eventType: event.eventType,
        payload: event.payload as Record<string, unknown>,
      });
      await OutboxEvent.updateOne(
        { _id: event._id },
        { $set: { status: "PUBLISHED", publishedAt: new Date(), lastError: null } },
      );
      published += 1;
    } catch (error) {
      const exhausted = event.attempts >= MAX_ATTEMPTS;
      await OutboxEvent.updateOne(
        { _id: event._id },
        {
          $set: {
            status: exhausted ? "FAILED" : "PENDING",
            availableAt: new Date(Date.now() + 2 ** event.attempts * 1000),
            lastError: error instanceof Error ? error.message.slice(0, 500) : "Publish failed",
          },
        },
      );
    }
  }
  return published;
}
