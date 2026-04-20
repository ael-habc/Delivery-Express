import Link from "next/link";

import { OrderCard } from "@/components/order-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireDeliveryUser } from "@/lib/auth";
import { appCopy } from "@/lib/copy";
import {
  ACTIVE_ORDER_STATUSES,
  buildOrderSearchWhere,
  ORDER_STATUS_LABELS,
  orderListInclude,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/src/generated/prisma";

type DeliveryOrdersSearchParams = {
  q?: string;
  status?: string;
};

function getDeliveryOrdersHref(status: OrderStatus, query?: string) {
  const params = new URLSearchParams({ status });
  const q = query?.trim();

  if (q) {
    params.set("q", q);
  }

  return `/delivery/orders?${params.toString()}`;
}

export default async function DeliveryOrdersPage({
  searchParams,
}: {
  searchParams: Promise<DeliveryOrdersSearchParams>;
}) {
  const [params, user] = await Promise.all([searchParams, requireDeliveryUser()]);

  const status =
    params.status && Object.values(OrderStatus).includes(params.status as OrderStatus)
      ? (params.status as OrderStatus)
      : undefined;
  const searchWhere = buildOrderSearchWhere(params.q);

  const orders = await prisma.order.findMany({
    where: {
      assignedToId: user.id,
      status: status ? status : { in: [...ACTIVE_ORDER_STATUSES] },
      ...(searchWhere ? { AND: [searchWhere] } : {}),
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{appCopy.deliveryOrders.filters}</CardTitle>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/delivery/orders">{appCopy.deliveryOrders.reset}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={appCopy.deliveryOrders.searchPlaceholder}
              className="sm:flex-1"
            />
            <Button type="submit" className="sm:min-w-32">
              {appCopy.deliveryOrders.search}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {ACTIVE_ORDER_STATUSES.map((value) => (
              <Button
                key={value}
                asChild
                variant={status === value ? "default" : "outline"}
              >
                <Link href={getDeliveryOrdersHref(value, params.q)}>
                  {ORDER_STATUS_LABELS[value]}
                </Link>
              </Button>
            ))}
          </div>
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
