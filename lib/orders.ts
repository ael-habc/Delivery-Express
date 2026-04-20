import "server-only";

import {
  OrderEventType,
  OrderStatus,
  PaymentType,
  UserRole,
  type Prisma,
} from "@/src/generated/prisma";
import {
  ACTIVE_ORDER_STATUSES,
  canApplyEvent,
  FINAL_ORDER_STATUSES,
  formatDateTime,
  formatMoney,
  getAllowedEventsForStatus,
  ORDER_EVENT_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/order-meta";
import { ensureDefaultUsers } from "@/lib/default-users";
import { prisma } from "@/lib/prisma";

export type StatusEventType =
  | "CONFIRMED"
  | "CALLED_CUSTOMER"
  | "WHATSAPP_ADDRESS_RECEIVED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export const STATUS_EVENT_MAP: Record<StatusEventType, OrderStatus> = {
  [OrderEventType.CONFIRMED]: OrderStatus.CONFIRMED,
  [OrderEventType.CALLED_CUSTOMER]: OrderStatus.CALLED_CUSTOMER,
  [OrderEventType.WHATSAPP_ADDRESS_RECEIVED]:
    OrderStatus.WHATSAPP_ADDRESS_RECEIVED,
  [OrderEventType.OUT_FOR_DELIVERY]: OrderStatus.OUT_FOR_DELIVERY,
  [OrderEventType.DELIVERED]: OrderStatus.DELIVERED,
  [OrderEventType.CANCELLED]: OrderStatus.CANCELLED,
};

export const ORDER_STATUS_FLOW: Record<
  OrderStatus,
  ReadonlyArray<OrderEventType>
> = {
  [OrderStatus.CONFIRMED]: [
    OrderEventType.CALLED_CUSTOMER,
    OrderEventType.CANCELLED,
    OrderEventType.NOTE,
  ],
  [OrderStatus.CALLED_CUSTOMER]: [
    OrderEventType.WHATSAPP_ADDRESS_RECEIVED,
    OrderEventType.CANCELLED,
    OrderEventType.NOTE,
  ],
  [OrderStatus.WHATSAPP_ADDRESS_RECEIVED]: [
    OrderEventType.OUT_FOR_DELIVERY,
    OrderEventType.CANCELLED,
    OrderEventType.NOTE,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderEventType.DELIVERED,
    OrderEventType.CANCELLED,
    OrderEventType.NOTE,
  ],
  [OrderStatus.DELIVERED]: [OrderEventType.NOTE],
  [OrderStatus.CANCELLED]: [OrderEventType.NOTE],
};

export const orderDetailsInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  events: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export const orderListInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderDetailsInclude;
}>;

export type OrderListItem = Prisma.OrderGetPayload<{
  include: typeof orderListInclude;
}>;

export function parseStatus(
  value: string | null
): OrderStatus | undefined | "invalid" {
  if (!value) return undefined;
  return Object.values(OrderStatus).includes(value as OrderStatus)
    ? (value as OrderStatus)
    : "invalid";
}

export function normalizeSearchTerm(value: string | null | undefined) {
  const term = value?.trim();
  return term ? term : undefined;
}

export function buildOrderSearchWhere(
  value: string | null | undefined
): Prisma.OrderWhereInput | undefined {
  const term = normalizeSearchTerm(value);

  if (!term) {
    return undefined;
  }

  const contains = {
    contains: term,
    mode: "insensitive" as const,
  };

  return {
    OR: [
      { orderNumber: contains },
      { customerName: contains },
      { phone: contains },
      { quartier: contains },
      { address: contains },
      { note: contains },
      {
        assignedTo: {
          is: {
            name: contains,
          },
        },
      },
    ],
  };
}

export function parsePaymentType(
  value: string | null | undefined
): PaymentType | undefined | "invalid" {
  if (!value) return undefined;
  return Object.values(PaymentType).includes(value as PaymentType)
    ? (value as PaymentType)
    : "invalid";
}

export function parseOrderEventType(
  value: string | null | undefined
): OrderEventType | undefined | "invalid" {
  if (!value) return undefined;
  return Object.values(OrderEventType).includes(value as OrderEventType)
    ? (value as OrderEventType)
    : "invalid";
}

export function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${fieldName} is required.`);
    return "";
  }

  return value.trim();
}

export function normalizeAmount(value: unknown, errors: string[]) {
  const raw = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(raw) || raw <= 0) {
    errors.push("amount must be a positive number.");
    return 0;
  }

  return raw;
}

export async function ensureDeliveryUser(
  userId: string | undefined | null,
  errors: string[]
) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    errors.push("assignedToId does not match an existing user.");
    return null;
  }

  if (user.role !== UserRole.DELIVERY) {
    errors.push("assignedToId must reference a delivery user.");
    return null;
  }

  return user;
}

export async function ensureUserExists(
  userId: string | undefined | null,
  errors: string[],
  fieldName = "createdById"
) {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    errors.push(`${fieldName} does not match an existing user.`);
    return null;
  }

  return user;
}

export async function getDeliveryUsers() {
  await ensureDefaultUsers();

  return prisma.user.findMany({
    where: { role: UserRole.DELIVERY },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function getDashboardStats() {
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    grouped.map((entry) => [entry.status, entry._count._all])
  ) as Partial<Record<OrderStatus, number>>;

  const totalOrders = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return {
    totalOrders,
    confirmed: counts[OrderStatus.CONFIRMED] ?? 0,
    outForDelivery: counts[OrderStatus.OUT_FOR_DELIVERY] ?? 0,
    delivered: counts[OrderStatus.DELIVERED] ?? 0,
    cancelled: counts[OrderStatus.CANCELLED] ?? 0,
  };
}

export {
  ACTIVE_ORDER_STATUSES,
  canApplyEvent,
  FINAL_ORDER_STATUSES,
  formatDateTime,
  formatMoney,
  getAllowedEventsForStatus,
  ORDER_EVENT_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
};
