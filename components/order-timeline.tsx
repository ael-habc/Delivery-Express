import { appCopy } from "@/lib/copy";
import { ORDER_EVENT_LABELS, formatDateTime } from "@/lib/order-meta";
import { type OrderWithDetails } from "@/lib/orders";
import { type OrderEventType } from "@/src/generated/prisma";

const EVENT_DONE_STYLES: Partial<
  Record<OrderEventType, { dot: string; title: string; card: string }>
> = {
  CONFIRMED: {
    dot: "bg-emerald-500",
    title: "text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/40",
  },
  CALLED_CUSTOMER: {
    dot: "bg-emerald-500",
    title: "text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/40",
  },
  WHATSAPP_ADDRESS_RECEIVED: {
    dot: "bg-emerald-500",
    title: "text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/40",
  },
  OUT_FOR_DELIVERY: {
    dot: "bg-emerald-500",
    title: "text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/40",
  },
  DELIVERED: {
    dot: "bg-emerald-500",
    title: "text-emerald-700",
    card: "border-emerald-100 bg-emerald-50/40",
  },
};

export function OrderTimeline({
  events,
}: {
  events: OrderWithDetails["events"];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {appCopy.timeline.empty}
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <div
            className={`mt-1 h-3 w-3 rounded-full ${
              EVENT_DONE_STYLES[event.type]?.dot ?? "bg-primary/70"
            }`}
          />
          <div
            className={`flex-1 rounded-2xl border p-4 ${
              EVENT_DONE_STYLES[event.type]?.card ?? "border-border bg-card"
            }`}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={`font-medium ${
                  EVENT_DONE_STYLES[event.type]?.title ?? ""
                }`}
              >
                {ORDER_EVENT_LABELS[event.type]}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </p>
            </div>
            {event.note ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {event.note}
              </p>
            ) : null}
            {event.createdBy ? (
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {event.createdBy.name}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
