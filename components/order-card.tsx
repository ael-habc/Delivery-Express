import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_TYPE_LABELS, formatMoney } from "@/lib/order-meta";
import { type OrderListItem } from "@/lib/orders";

export function OrderCard({
  order,
  href,
}: {
  order: OrderListItem;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-transform hover:-translate-y-0.5">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {order.orderNumber}
            </p>
            <CardTitle>{order.customerName}</CardTitle>
          </div>
          <StatusBadge status={order.status} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p className="font-medium">{order.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Quartier</p>
              <p className="font-medium">{order.quartier || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Montant</p>
              <p className="font-medium">{formatMoney(order.amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paiement</p>
              <p className="font-medium">{PAYMENT_TYPE_LABELS[order.paymentType]}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
            <span className="text-muted-foreground">Livreur</span>
            <span className="font-medium">
              {order.assignedTo?.name ?? "Non assigné"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
