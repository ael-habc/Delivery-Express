"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  getAllowedEventsForStatus,
  ORDER_STATUS_LABELS,
} from "@/lib/order-meta";
import { OrderEventType, type OrderStatus } from "@/src/generated/prisma";

const ACTIONS = [
  { type: OrderEventType.CALLED_CUSTOMER, label: "Client appelé" },
  {
    type: OrderEventType.WHATSAPP_ADDRESS_RECEIVED,
    label: "Adresse reçue WhatsApp",
  },
  { type: OrderEventType.OUT_FOR_DELIVERY, label: "En livraison" },
  { type: OrderEventType.DELIVERED, label: "Livrée" },
  { type: OrderEventType.CANCELLED, label: "Annulée" },
] as const;

const DELIVERY_STEP_ORDER = [
  OrderEventType.CALLED_CUSTOMER,
  OrderEventType.WHATSAPP_ADDRESS_RECEIVED,
  OrderEventType.OUT_FOR_DELIVERY,
  OrderEventType.DELIVERED,
] as const;

const STATUS_STEP_INDEX: Partial<Record<OrderStatus, number>> = {
  CALLED_CUSTOMER: 0,
  WHATSAPP_ADDRESS_RECEIVED: 1,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
};

const CANCEL_REASONS = [
  "Client Injoignable",
  "Commande refusée",
  "Commande reportée",
] as const;

export function DeliveryActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const allowedEvents = useMemo(
    () => getAllowedEventsForStatus(status),
    [status],
  );
  const currentStepIndex = STATUS_STEP_INDEX[status] ?? -1;

  async function submitEvent(type: OrderEventType, note?: string) {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/orders/${orderId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        note,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      setError(
        result.details?.join(" ") || result.error || "Action impossible.",
      );
      setIsSubmitting(false);
      return;
    }

    setCancelReason("");
    setShowCancelReason(false);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {ACTIONS.map((action) => {
          const disabled = !allowedEvents.some(
            (eventType) => eventType === action.type,
          );
          const isCancel = action.type === OrderEventType.CANCELLED;
          const stepIndex = DELIVERY_STEP_ORDER.indexOf(
            action.type as (typeof DELIVERY_STEP_ORDER)[number],
          );
          const isCompleted = stepIndex !== -1 && stepIndex <= currentStepIndex;

          return (
            <Button
              key={action.type}
              type="button"
              size="lg"
              variant={isCancel ? "destructive" : "default"}
              className={
                isCompleted
                  ? "h-14 justify-start rounded-2xl border px-4 text-base text-white hover:opacity-100"
                  : "h-14 justify-start rounded-2xl px-4 text-base"
              }
              style={
                isCompleted
                  ? {
                      backgroundColor: "lab(48 -64.12 50.13)",
                      borderColor: "lab(48 -64.12 50.13)",
                    }
                  : undefined
              }
              disabled={isCompleted || disabled || isSubmitting}
              onClick={() => {
                if (isCancel) {
                  setShowCancelReason(true);
                  return;
                }

                submitEvent(action.type);
              }}
            >
              {action.label}
            </Button>
          );
        })}
      </div>

      {showCancelReason ? (
        <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">
            Motif d&apos;annulation obligatoire
          </p>
          <Select
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          >
            <option value="">Choisir un motif</option>
            {CANCEL_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting || cancelReason.trim().length === 0}
              onClick={() =>
                submitEvent(OrderEventType.CANCELLED, cancelReason)
              }
            >
              Confirmer l&apos;annulation
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCancelReason(false);
                setCancelReason("");
              }}
            >
              Fermer
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {allowedEvents.length === 1 &&
      allowedEvents[0] === OrderEventType.NOTE ? (
        <p className="rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
          Statut final atteint: {ORDER_STATUS_LABELS[status]}.
        </p>
      ) : null}
    </div>
  );
}
