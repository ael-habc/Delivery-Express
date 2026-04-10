import type { OrderEventType, OrderStatus, PaymentType } from "@/src/generated/prisma";

export const ACTIVE_ORDER_STATUSES = [
  "CONFIRMED",
  "CALLED_CUSTOMER",
  "WHATSAPP_ADDRESS_RECEIVED",
  "OUT_FOR_DELIVERY",
] as const satisfies ReadonlyArray<OrderStatus>;

export const FINAL_ORDER_STATUSES = [
  "DELIVERED",
  "CANCELLED",
] as const satisfies ReadonlyArray<OrderStatus>;

export const ORDER_STATUS_LABELS = {
  CONFIRMED: "Confirmee",
  CALLED_CUSTOMER: "Client appele",
  WHATSAPP_ADDRESS_RECEIVED: "Adresse recue WhatsApp",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Livree",
  CANCELLED: "Annulee",
} satisfies Record<OrderStatus, string>;

export const ORDER_STATUS_COLOR_CLASSES = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  CALLED_CUSTOMER: "bg-slate-100 text-slate-700",
  WHATSAPP_ADDRESS_RECEIVED: "bg-amber-100 text-amber-700",
  OUT_FOR_DELIVERY: "bg-yellow-100 text-yellow-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
} satisfies Record<OrderStatus, string>;

export const ORDER_STATUS_BAR_CLASSES = {
  CONFIRMED: "bg-blue-500",
  CALLED_CUSTOMER: "bg-slate-500",
  WHATSAPP_ADDRESS_RECEIVED: "bg-amber-500",
  OUT_FOR_DELIVERY: "bg-yellow-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
} satisfies Record<OrderStatus, string>;

export const PAYMENT_TYPE_LABELS = {
  COD: "COD",
  CMI: "CMI",
  OTHER: "Autre",
} satisfies Record<PaymentType, string>;

export const ORDER_EVENT_LABELS = {
  CONFIRMED: "Commande confirmee",
  CALLED_CUSTOMER: "Client appele",
  WHATSAPP_ADDRESS_RECEIVED: "Adresse recue sur WhatsApp",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Commande livree",
  CANCELLED: "Commande annulee",
  NOTE: "Note",
} satisfies Record<OrderEventType, string>;

export function getAllowedEventsForStatus(status: OrderStatus) {
  const flow = {
    CONFIRMED: ["CALLED_CUSTOMER", "CANCELLED", "NOTE"],
    CALLED_CUSTOMER: ["WHATSAPP_ADDRESS_RECEIVED", "CANCELLED", "NOTE"],
    WHATSAPP_ADDRESS_RECEIVED: ["OUT_FOR_DELIVERY", "CANCELLED", "NOTE"],
    OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED", "NOTE"],
    DELIVERED: ["NOTE"],
    CANCELLED: ["NOTE"],
  } satisfies Record<OrderStatus, ReadonlyArray<OrderEventType>>;

  return flow[status] as ReadonlyArray<OrderEventType>;
}

export function canApplyEvent(status: OrderStatus, eventType: OrderEventType) {
  return getAllowedEventsForStatus(status).includes(eventType);
}

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
