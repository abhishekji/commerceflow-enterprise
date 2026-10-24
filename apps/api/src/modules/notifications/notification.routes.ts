import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { Notification } from "./notification.model.js";

export const notificationRouter = Router();

notificationRouter.get("/", authenticate, async (request, response, next) => {
  try {
    const { tenantId, userId } = request.auth!;
    const notifications = await Notification.find({ tenantId, userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    response.json({
      data: notifications.map((notification) => ({
        id: notification._id.toString(),
        orderId: notification.orderId?.toString() ?? null,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});
