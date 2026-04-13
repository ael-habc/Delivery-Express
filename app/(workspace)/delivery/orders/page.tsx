import Link from "next/link";

import { OrderCard } from "@/components/order-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireDeliveryUser } from "@/lib/auth";
import { appCopy } from "@/lib/copy";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  orderListInclude,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/src/generated/prisma";

export default async function DeliveryOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireDeliveryUser()]);

  const status =
    params.status && Object.values(OrderStatus).includes(params.status as OrderStatus)
      ? (params.status as OrderStatus)
      : undefined;

  const orders = await prisma.order.findMany({
    where: {
      assignedToId: user.id,
      status: status ? status : { in: [...ACTIVE_ORDER_STATUSES] },
    },
    include: orderListInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {appCopy.deliveryOrders.title}
        </h2>
        <p className="text-muted-foreground">
          {appCopy.deliveryOrders.subtitle.replace("{name}", user.name ?? "")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{appCopy.deliveryOrders.filters}</CardTitle>
          <Button asChild variant="outline">
            <Link href="/delivery/orders">{appCopy.deliveryOrders.reset}</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ACTIVE_ORDER_STATUSES.map((value) => (
            <Button
              key={value}
              asChild
              variant={status === value ? "default" : "outline"}
            >
              <Link href={`/delivery/orders?status=${value}`}>
                {ORDER_STATUS_LABELS[value]}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} href={`/delivery/orders/${order.id}`} />
        ))}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {appCopy.deliveryOrders.empty}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
