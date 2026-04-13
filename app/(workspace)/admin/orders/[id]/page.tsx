import { notFound } from "next/navigation";

import { OrderForm } from "@/components/order-form";
import { OrderNoteForm } from "@/components/order-note-form";
import { OrderTimeline } from "@/components/order-timeline";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appCopy } from "@/lib/copy";
import { getDeliveryUsers, orderDetailsInclude, PAYMENT_TYPE_LABELS } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, deliveryUsers] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: orderDetailsInclude,
    }),
    getDeliveryUsers(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{appCopy.adminOrderDetail.edit}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderForm
                mode="update"
                deliveryUsers={deliveryUsers}
                order={{
                  id: order.id,
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  phone: order.phone,
                  quartier: order.quartier,
                  address: order.address,
                  note: order.note,
                  amount: order.amount,
                  paymentType: order.paymentType,
                  assignedToId: order.assignedToId,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{appCopy.adminOrderDetail.addNote}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderNoteForm orderId={order.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{appCopy.adminOrderDetail.quickInfo}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <Info label={appCopy.adminOrderDetail.phone} value={order.phone} />
              <Info
                label={appCopy.adminOrderDetail.quartier}
                value={order.quartier || appCopy.adminOrderDetail.emptyValue}
              />
              <Info
                label={appCopy.adminOrderDetail.address}
                value={order.address || appCopy.adminOrderDetail.emptyValue}
              />
              <Info
                label={appCopy.adminOrderDetail.note}
                value={order.note || appCopy.adminOrderDetail.emptyValue}
              />
              <Info
                label={appCopy.adminOrderDetail.payment}
                value={PAYMENT_TYPE_LABELS[order.paymentType]}
              />
              <Info
                label={appCopy.adminOrderDetail.delivery}
                value={order.assignedTo?.name || appCopy.adminOrderDetail.unassigned}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{appCopy.adminOrderDetail.timeline}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline events={order.events} />
            </CardContent>
          </Card>
        </div>
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
