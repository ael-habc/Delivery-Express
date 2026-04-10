import { type Prisma } from "@/src/generated/prisma";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import {
  ensureDeliveryUser,
  normalizeAmount,
  orderDetailsInclude,
  parsePaymentType,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id || !session.user.role) {
      return jsonError("Unauthorized.", 401);
    }

    const { id } = await context.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        ...(session.user.role === "DELIVERY"
          ? { assignedToId: session.user.id }
          : {}),
      },
      include: orderDetailsInclude,
    });

    if (!order) {
      return jsonError("Order not found.", 404);
    }

    return jsonSuccess(order);
  } catch (error) {
    return handleRouteError(error, "Failed to load order details.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return jsonError("Unauthorized.", 401);
    }

    const { id } = await context.params;
    const body = await request.json();
    const errors: string[] = [];

    const data: Prisma.OrderUpdateInput = {};

    if ("customerName" in body) {
      if (typeof body.customerName !== "string" || body.customerName.trim() === "") {
        errors.push("customerName must be a non-empty string.");
      } else {
        data.customerName = body.customerName.trim();
      }
    }

    if ("phone" in body) {
      if (typeof body.phone !== "string" || body.phone.trim() === "") {
        errors.push("phone must be a non-empty string.");
      } else {
        data.phone = body.phone.trim();
      }
    }

    if ("quartier" in body) {
      data.quartier =
        typeof body.quartier === "string" && body.quartier.trim()
          ? body.quartier.trim()
          : null;
    }

    if ("address" in body) {
      data.address =
        typeof body.address === "string" && body.address.trim()
          ? body.address.trim()
          : null;
    }

    if ("note" in body) {
      data.note =
        typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    }

    if ("amount" in body) {
      data.amount = normalizeAmount(body.amount, errors);
    }

    if ("paymentType" in body) {
      const paymentType = parsePaymentType(body.paymentType);
      if (paymentType === "invalid" || !paymentType) {
        errors.push("paymentType must be one of COD, CMI, or OTHER.");
      } else {
        data.paymentType = paymentType;
      }
    }

    if ("assignedToId" in body) {
      const assignedToId =
        typeof body.assignedToId === "string" && body.assignedToId.trim()
          ? body.assignedToId.trim()
          : null;

      await ensureDeliveryUser(assignedToId, errors);
      data.assignedTo =
        assignedToId === null
          ? { disconnect: true }
          : { connect: { id: assignedToId } };
    }

    if (errors.length > 0) {
      return jsonError("Invalid order update payload.", 400, errors);
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingOrder) {
      return jsonError("Order not found.", 404);
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: orderDetailsInclude,
    });

    return jsonSuccess(order);
  } catch (error) {
    return handleRouteError(error, "Failed to update order.");
  }
}
