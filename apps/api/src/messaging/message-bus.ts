import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { env } from "../config/env.js";

export interface DomainMessage {
  eventId: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export type MessageHandler = (message: DomainMessage) => Promise<void>;

export interface MessageBus {
  readonly kind: "sqs" | "local";
  publish(message: DomainMessage): Promise<void>;
  start(handler: MessageHandler): void;
  stop(): Promise<void>;
}

const MAX_LOCAL_ATTEMPTS = 3;

/** In-process queue used when no SQS queue is configured (local development). */
class LocalBus implements MessageBus {
  readonly kind = "local" as const;
  private handler: MessageHandler | undefined;
  private timers = new Set<NodeJS.Timeout>();
  private stopped = false;

  async publish(message: DomainMessage) {
    this.dispatch(message, 1);
  }

  start(handler: MessageHandler) {
    this.handler = handler;
  }

  private dispatch(message: DomainMessage, attempt: number) {
    const timer = setTimeout(async () => {
      this.timers.delete(timer);
      if (this.stopped || !this.handler) return;
      try {
        await this.handler(message);
      } catch (error) {
        if (attempt < MAX_LOCAL_ATTEMPTS) {
          this.dispatch(message, attempt + 1);
        } else {
          console.error(`Dropped ${message.eventType} (${message.eventId}) after ${attempt} attempts`, error);
        }
      }
    }, attempt === 1 ? 0 : 1000 * attempt);
    this.timers.add(timer);
  }

  async stop() {
    this.stopped = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}

class SqsBus implements MessageBus {
  readonly kind = "sqs" as const;
  private client = new SQSClient({ region: env.AWS_REGION });
  private running = false;
  private loop: Promise<void> | undefined;

  constructor(private queueUrl: string) {}

  async publish(message: DomainMessage) {
    await this.client.send(
      new SendMessageCommand({ QueueUrl: this.queueUrl, MessageBody: JSON.stringify(message) }),
    );
  }

  start(handler: MessageHandler) {
    this.running = true;
    this.loop = this.poll(handler);
  }

  private async poll(handler: MessageHandler) {
    while (this.running) {
      try {
        const result = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 10,
          }),
        );
        for (const sqsMessage of result.Messages ?? []) {
          try {
            await handler(JSON.parse(sqsMessage.Body ?? "{}") as DomainMessage);
            // Deleted only after success; failures reappear after the visibility timeout.
            await this.client.send(
              new DeleteMessageCommand({ QueueUrl: this.queueUrl, ReceiptHandle: sqsMessage.ReceiptHandle }),
            );
          } catch (error) {
            console.error("Message handling failed; it will be redelivered", error);
          }
        }
      } catch (error) {
        console.error("SQS receive failed", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async stop() {
    this.running = false;
    await this.loop;
  }
}

export function createMessageBus(): MessageBus {
  return env.AWS_SQS_QUEUE_URL ? new SqsBus(env.AWS_SQS_QUEUE_URL) : new LocalBus();
}
