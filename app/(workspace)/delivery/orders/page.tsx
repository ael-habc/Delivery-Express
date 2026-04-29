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
  type OrderListItem,
  orderListInclude,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/src/generated/prisma";

type DeliveryOrdersSearchParams = {
  q?: string;
  status?: string;
};

type OrderGroup = {
  label: string;
  orders: OrderListItem[];
};

function getDeliveryOrdersHref(status: OrderStatus, query?: string) {
  const params = new URLSearchParams({ status });
  const q = query?.trim();

  if (q) {
    params.set("q", q);
  }

  return `/delivery/orders?${params.toString()}`;
}

function groupOrdersByQuartier(orders: OrderListItem[], emptyLabel: string) {
  const groups = new Map<string, OrderGroup>();

  for (const order of orders) {
    const rawQuartier = order.quartier?.trim();
    const label = rawQuartier || emptyLabel;
    const key = rawQuartier ? rawQuartier.toLocaleLowerCase("fr-FR") : "__empty__";
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.orders.push(order);
      continue;
    }

    groups.set(key, {
      label,
      orders: [order],
    });
  }

  return Array.from(groups.entries())
    .sort(([leftKey, leftGroup], [rightKey, rightGroup]) => {
      if (leftKey === "__empty__") return 1;
      if (rightKey === "__empty__") return -1;

      return leftGroup.label.localeCompare(rightGroup.label, "fr", {
        sensitivity: "base",
      });
    })
    .map(([, group]) => group);
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
    orderBy: [{ quartier: "asc" }, { status: "asc" }, { createdAt: "desc" }],
  });
  const orderGroups = groupOrdersByQuartier(orders, "Sans quartier");

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
        {orderGroups.map((group) => (
          <section key={group.label} className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <h3 className="text-lg font-semibold tracking-tight">{group.label}</h3>
              <span className="text-sm text-muted-foreground">
                {group.orders.length} commande{group.orders.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid gap-4">
              {group.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  href={`/delivery/orders/${order.id}`}
                />
              ))}
            </div>
          </section>
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
