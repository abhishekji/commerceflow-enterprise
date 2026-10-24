import { randomBytes } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { AuditLog } from "../audit/audit-log.model.js";
import { OutboxEvent } from "../events/outbox-event.model.js";
import { Order } from "../orders/order.model.js";
import { Payment, type PaymentMethod } from "./payment.model.js";

export const netBankingBanks = ["DEMO_BANK_A", "DEMO_BANK_B", "DEMO_BANK_C"] as const;
export const wallets = ["DEMO_WALLET", "DEMO_PAY"] as const;

const cardSchema = z.object({
  method: z.literal("CARD"),
  cardholderName: z.string().trim().min(2).max(80),
  cardNumber: z.string().transform((value) => value.replace(/[\s-]/g, "")).pipe(z.string().regex(/^\d{12,19}$/)),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
  cvv: z.string().regex(/^\d{3,4}$/),
});
const upiSchema = z.object({
  method: z.literal("UPI"),
  upiId: z.string().trim().regex(/^[\w.-]{2,64}@[A-Za-z]{2,32}$/),
});
const netBankingSchema = z.object({ method: z.literal("NET_BANKING"), bank: z.enum(netBankingBanks) });
const walletSchema = z.object({ method: z.literal("WALLET"), wallet: z.enum(wallets) });
const codSchema = z.object({ method: z.literal("COD") });

export const payOrderSchema = z.discriminatedUnion("method", [
  cardSchema,
  upiSchema,
  netBankingSchema,
  walletSchema,
  codSchema,
]);
export type PayOrderInput = z.infer<typeof payOrderSchema>;

function paymentError(statusCode: number, code: string) {
  return Object.assign(new Error(code), { statusCode, code });
}

function luhnValid(number: string) {
  let sum = 0;
  let double = false;
  for (let index = number.length - 1; index >= 0; index--) {
    let digit = Number(number[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function cardBrand(number: string) {
  if (/^4/.test(number)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(number)) return "Mastercard";
  if (/^3[47]/.test(number)) return "Amex";
  return "Card";
}

function expired(expiry: string) {
  const [month, year] = expiry.split("/").map(Number) as [number, number];
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  return year < currentYear || (year === currentYear && month < now.getMonth() + 1);
}

interface GatewayResult {
  approved: boolean;
  reason?: string;
  instrument: string | null;
}

/**
 * Dummy gateway: nothing is ever charged. Test inputs:
 *  - card ending 0002 is declined (insufficient funds); any other Luhn-valid card (e.g. 4242 4242 4242 4242) succeeds
 *  - UPI id starting with "fail" is declined
 */
function simulateGateway(input: PayOrderInput): GatewayResult {
  switch (input.method) {
    case "CARD": {
      if (!luhnValid(input.cardNumber)) throw paymentError(400, "INVALID_CARD_NUMBER");
      if (expired(input.expiry)) throw paymentError(400, "CARD_EXPIRED");
      const instrument = `${cardBrand(input.cardNumber)} •••• ${input.cardNumber.slice(-4)}`;
      if (input.cardNumber.endsWith("0002")) {
        return { approved: false, reason: "INSUFFICIENT_FUNDS", instrument };
      }
      return { approved: true, instrument };
    }
    case "UPI": {
      const [handle = ""] = input.upiId.split("@");
      const instrument = `UPI ${handle.slice(0, 2)}•••@${input.upiId.split("@")[1]}`;
      if (input.upiId.toLowerCase().startsWith("fail")) {
        return { approved: false, reason: "UPI_REQUEST_REJECTED", instrument };
      }
      return { approved: true, instrument };
    }
    case "NET_BANKING":
      return { approved: true, instrument: `Net banking · ${input.bank}` };
    case "WALLET":
      return { approved: true, instrument: `Wallet · ${input.wallet}` };
    case "COD":
      return { approved: true, instrument: "Pay on delivery" };
  }
}

export async function payOrder(input: {
  tenantId: string;
  userId: string;
  orderId: string;
  payment: PayOrderInput;
  requestId?: string;
}) {
  const { tenantId, userId, orderId, payment, requestId } = input;
  const tenantObjectId = new Types.ObjectId(tenantId);
  const customerObjectId = new Types.ObjectId(userId);

  const order = await Order.findOne({ _id: orderId, tenantId: tenantObjectId, customerId: customerObjectId }).lean();
  if (!order) throw paymentError(404, "ORDER_NOT_FOUND");
  if (order.status !== "PENDING") throw paymentError(409, "ORDER_NOT_PAYABLE");
  if (order.paymentStatus !== "UNPAID") throw paymentError(409, "ALREADY_PAID");

  const gateway = simulateGateway(payment);
  const reference = `PAY-${randomBytes(6).toString("hex").toUpperCase()}`;
  const base = {
    tenantId: tenantObjectId,
    orderId: order._id,
    customerId: customerObjectId,
    method: payment.method as PaymentMethod,
    amountMinor: order.totalMinor,
    currency: order.currency,
    reference,
    instrument: gateway.instrument,
  };

  if (!gateway.approved) {
    await Payment.create({ ...base, status: "FAILED", failureReason: gateway.reason });
    await AuditLog.create({
      tenantId: tenantObjectId,
      actorType: "USER",
      actorId: customerObjectId,
      action: "payment.failed",
      resourceType: "Order",
      resourceId: order._id,
      requestId: requestId ?? null,
      metadata: { method: payment.method, reason: gateway.reason, reference },
    });
    throw Object.assign(paymentError(402, "PAYMENT_DECLINED"), { reason: gateway.reason });
  }

  const isCod = payment.method === "COD";
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // The status/payment guard makes a double submit or a concurrent cancellation fail instead of double-paying.
      const updated = await Order.findOneAndUpdate(
        { _id: order._id, tenantId: tenantObjectId, status: "PENDING", paymentStatus: "UNPAID" },
        {
          $set: {
            paymentStatus: isCod ? "COD" : "PAID",
            paymentMethod: payment.method,
            paymentReference: reference,
            paymentSummary: gateway.instrument,
            paidAt: isCod ? null : new Date(),
          },
        },
        { session, returnDocument: "after" },
      );
      if (!updated) throw paymentError(409, "ORDER_CHANGED");

      await Payment.create([{ ...base, status: isCod ? "PENDING_COD" : "SUCCEEDED" }], { session });
      await OutboxEvent.create(
        [
          {
            tenantId: tenantObjectId,
            aggregateType: "Order",
            aggregateId: order._id,
            eventType: "payment.succeeded",
            payload: {
              orderId,
              customerId: userId,
              method: payment.method,
              amountMinor: order.totalMinor,
              currency: order.currency,
              reference,
              cashOnDelivery: isCod,
            },
          },
        ],
        { session },
      );
      await AuditLog.create(
        [
          {
            tenantId: tenantObjectId,
            actorType: "USER",
            actorId: customerObjectId,
            action: isCod ? "payment.cod_selected" : "payment.succeeded",
            resourceType: "Order",
            resourceId: order._id,
            requestId: requestId ?? null,
            metadata: { method: payment.method, amountMinor: order.totalMinor, reference },
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return { reference };
}
