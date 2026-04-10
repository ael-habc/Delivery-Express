import { ORDER_STATUS_COLOR_CLASSES, ORDER_STATUS_LABELS } from "@/lib/order-meta";
import { cn } from "@/lib/utils";
import { type OrderStatus } from "@/src/generated/prisma";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        ORDER_STATUS_COLOR_CLASSES[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
