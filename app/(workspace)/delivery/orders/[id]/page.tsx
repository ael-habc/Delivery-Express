import { notFound } from "next/navigation";

import { DeliveryActions } from "@/components/delivery-actions";
import { OrderTimeline } from "@/components/order-timeline";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDeliveryUser } from "@/lib/auth";
import { appCopy } from "@/lib/copy";
import { formatMoney, orderDetailsInclude, PAYMENT_TYPE_LABELS } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function DeliveryOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, requireDeliveryUser()]);

  const order = await prisma.order.findFirst({
    where: {
      id,
      assignedToId: user.id,
    },
    include: orderDetailsInclude,
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {order.orderNumber}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {order.customerName}
            </h2>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={`tel:${order.phone}`}>{appCopy.deliveryOrderDetail.call}</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a
              href={`https://wa.me/${order.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              {appCopy.deliveryOrderDetail.openWhatsapp}
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{appCopy.deliveryOrderDetail.usefulInfo}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <Info label={appCopy.deliveryOrderDetail.phone} value={order.phone} />
              <Info
                label={appCopy.deliveryOrderDetail.quartier}
                value={order.quartier || appCopy.deliveryOrderDetail.emptyValue}
              />
              <Info
                label={appCopy.deliveryOrderDetail.address}
                value={order.address || appCopy.deliveryOrderDetail.emptyValue}
              />
              <Info
                label={appCopy.deliveryOrderDetail.note}
                value={order.note || appCopy.deliveryOrderDetail.emptyValue}
              />
              <Info
                label={appCopy.deliveryOrderDetail.amount}
                value={formatMoney(order.amount)}
              />
              <Info
                label={appCopy.deliveryOrderDetail.payment}
                value={PAYMENT_TYPE_LABELS[order.paymentType]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{appCopy.deliveryOrderDetail.quickActions}</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliveryActions orderId={order.id} status={order.status} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{appCopy.deliveryOrderDetail.timeline}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline events={order.events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium leading-6">{value}</p>
    </div>
  );
}
