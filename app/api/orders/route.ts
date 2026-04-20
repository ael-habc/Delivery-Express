import { type Prisma, OrderEventType, OrderStatus, type PaymentType } from "@/src/generated/prisma";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { appCopy } from "@/lib/copy";
import {
  buildOrderSearchWhere,
  ensureDeliveryUser,
  normalizeAmount,
  normalizeRequiredString,
  orderListInclude,
  parsePaymentType,
  parseStatus,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id || !session.user.role) {
      return jsonError("Unauthorized.", 401);
    }

    const { searchParams } = new URL(request.url);
    const status = parseStatus(searchParams.get("status"));
    const assignedToId = searchParams.get("assignedToId");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const query = searchParams.get("q");

    if (status === "invalid") {
      return jsonError("Invalid status filter.", 400);
    }

    const where: Prisma.OrderWhereInput = {};
    const searchWhere = buildOrderSearchWhere(query);

    if (searchWhere) {
      where.AND = [searchWhere];
    }

    if (status) {
      where.status = status;
    }

    if (assignedToId && session.user.role !== "DELIVERY") {
      where.assignedToId = assignedToId;
    }

    if (session.user.role === "DELIVERY") {
      where.assignedToId = session.user.id;
    }

    if (minAmount || maxAmount) {
      where.amount = {};

      if (minAmount) {
        const parsedMinAmount = Number(minAmount);
        if (!Number.isFinite(parsedMinAmount)) {
          return jsonError("Invalid minAmount filter.", 400);
        }
        where.amount.gte = parsedMinAmount;
      }

      if (maxAmount) {
        const parsedMaxAmount = Number(maxAmount);
        if (!Number.isFinite(parsedMaxAmount)) {
          return jsonError("Invalid maxAmount filter.", 400);
        }
        where.amount.lte = parsedMaxAmount;
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        const parsedDateFrom = new Date(`${dateFrom}T00:00:00.000`);
        if (Number.isNaN(parsedDateFrom.getTime())) {
          return jsonError("Invalid dateFrom filter.", 400);
        }
        where.createdAt.gte = parsedDateFrom;
      }

      if (dateTo) {
        const parsedDateTo = new Date(`${dateTo}T23:59:59.999`);
        if (Number.isNaN(parsedDateTo.getTime())) {
          return jsonError("Invalid dateTo filter.", 400);
        }
        where.createdAt.lte = parsedDateTo;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: orderListInclude,
      orderBy: [{ createdAt: "desc" }],
    });

    return jsonSuccess(orders);
  } catch (error) {
    return handleRouteError(error, "Failed to load orders.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return jsonError("Unauthorized.", 401);
    }

    const body = await request.json();
    const errors: string[] = [];

    const orderNumber = normalizeRequiredString(
      body.orderNumber,
      "orderNumber",
      errors
    );
    const customerName = normalizeRequiredString(
      body.customerName,
      "customerName",
      errors
    );
    const phone = normalizeRequiredString(body.phone, "phone", errors);
    const amount = normalizeAmount(body.amount, errors);

    const paymentType = parsePaymentType(body.paymentType);
    if (paymentType === "invalid" || !paymentType) {
      errors.push("paymentType must be one of COD, CMI, or OTHER.");
    }

    const assignedToId =
      typeof body.assignedToId === "string" && body.assignedToId.trim().length > 0
        ? body.assignedToId.trim()
        : null;

    await ensureDeliveryUser(assignedToId, errors);

    if (errors.length > 0) {
      return jsonError("Invalid order payload.", 400, errors);
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        phone,
        quartier:
          typeof body.quartier === "string" && body.quartier.trim()
            ? body.quartier.trim()
            : null,
        address:
          typeof body.address === "string" && body.address.trim()
            ? body.address.trim()
            : null,
        note:
          typeof body.note === "string" && body.note.trim()
            ? body.note.trim()
            : null,
        amount,
        paymentType: paymentType as PaymentType,
        assignedToId,
        status: OrderStatus.CONFIRMED,
        events: {
          create: {
            type: OrderEventType.CONFIRMED,
            note: appCopy.events.CONFIRMED,
            createdById: session.user.id,
          },
        },
      },
      include: {
        ...orderListInclude,
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return jsonSuccess(order, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return jsonError("orderNumber must be unique.", 409);
    }

    return handleRouteError(error, "Failed to create order.");
  }
}
