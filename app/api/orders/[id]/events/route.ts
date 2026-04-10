import { OrderEventType } from "@/src/generated/prisma";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import {
  canApplyEvent,
  orderDetailsInclude,
  parseOrderEventType,
  STATUS_EVENT_MAP,
  type StatusEventType,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ALLOWED_EVENT_TYPES = [
  OrderEventType.CALLED_CUSTOMER,
  OrderEventType.WHATSAPP_ADDRESS_RECEIVED,
  OrderEventType.OUT_FOR_DELIVERY,
  OrderEventType.DELIVERED,
  OrderEventType.CANCELLED,
  OrderEventType.NOTE,
] as const;

type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id || !session.user.role) {
      return jsonError("Unauthorized.", 401);
    }

    const { id } = await context.params;
    const body = await request.json();
    const errors: string[] = [];

    const eventType = parseOrderEventType(body.type);
    const allowedEventType =
      eventType &&
      eventType !== "invalid" &&
      ALLOWED_EVENT_TYPES.includes(eventType as AllowedEventType)
        ? (eventType as AllowedEventType)
        : null;

    if (!allowedEventType) {
      errors.push("type must be a supported event type.");
    }

    const note =
      typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

    if (allowedEventType === OrderEventType.CANCELLED && !note) {
      errors.push("Cancellation reason is required.");
    }

    if (errors.length > 0) {
      return jsonError("Invalid event payload.", 400, errors);
    }

    if (!allowedEventType) {
      return jsonError("Invalid event payload.", 400, [
        "type must be a supported event type.",
      ]);
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        assignedToId: true,
      },
    });

    if (!order) {
      return jsonError("Order not found.", 404);
    }

    if (
      session.user.role === "DELIVERY" &&
      order.assignedToId !== session.user.id
    ) {
      return jsonError("Forbidden.", 403);
    }

    if (!canApplyEvent(order.status, allowedEventType)) {
      return jsonError(
        `Event ${allowedEventType} is not allowed when order status is ${order.status}.`,
        409
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: allowedEventType,
          note,
          createdById: session.user.id,
        },
      });

      if (allowedEventType !== OrderEventType.NOTE) {
        await tx.order.update({
          where: { id },
          data: {
            status: STATUS_EVENT_MAP[allowedEventType as StatusEventType],
          },
        });
      }

      return tx.order.findUnique({
        where: { id },
        include: orderDetailsInclude,
      });
    });

    return jsonSuccess(updatedOrder);
  } catch (error) {
    return handleRouteError(error, "Failed to add order event.");
  }
}
