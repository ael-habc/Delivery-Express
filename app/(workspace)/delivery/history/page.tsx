import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireDeliveryUser } from "@/lib/auth";
import { appCopy } from "@/lib/copy";
import {
  buildOrderSearchWhere,
  FINAL_ORDER_STATUSES,
  formatDateTime,
  formatMoney,
  ORDER_STATUS_LABELS,
  orderListInclude,
  PAYMENT_TYPE_LABELS,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { OrderEventType } from "@/src/generated/prisma";

type DeliveryHistorySearchParams = {
  q?: string;
  status?: string;
};

type DeliveryHistoryStatus = (typeof FINAL_ORDER_STATUSES)[number];

const FINAL_EVENT_TYPES = [
  OrderEventType.DELIVERED,
  OrderEventType.CANCELLED,
] as const;

function isDeliveryHistoryStatus(value: string): value is DeliveryHistoryStatus {
  return FINAL_ORDER_STATUSES.includes(value as DeliveryHistoryStatus);
}

function getHistoryHref(status: DeliveryHistoryStatus, query?: string) {
  const params = new URLSearchParams({ status });
  const q = query?.trim();

  if (q) {
    params.set("q", q);
  }

  return `/delivery/history?${params.toString()}`;
}

export default async function DeliveryHistoryPage({
  searchParams,
}: {
  searchParams: Promise<DeliveryHistorySearchParams>;
}) {
  const [params, user] = await Promise.all([searchParams, requireDeliveryUser()]);

  const status = params.status && isDeliveryHistoryStatus(params.status)
    ? params.status
    : undefined;
  const searchWhere = buildOrderSearchWhere(params.q);

  const orders = await prisma.order.findMany({
    where: {
      assignedToId: user.id,
      status: status ? status : { in: [...FINAL_ORDER_STATUSES] },
      ...(searchWhere ? { AND: [searchWhere] } : {}),
    },
    include: {
      ...orderListInclude,
      events: {
        where: {
          type: {
            in: [...FINAL_EVENT_TYPES],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          type: true,
          createdAt: true,
        },
        take: 1,
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {appCopy.deliveryHistory.title}
        </h2>
        <p className="text-muted-foreground">
          {appCopy.deliveryHistory.subtitle.replace("{name}", user.name ?? "")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{appCopy.deliveryHistory.filters}</CardTitle>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/delivery/history">{appCopy.deliveryHistory.reset}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-col gap-3 sm:flex-row">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={appCopy.deliveryHistory.searchPlaceholder}
              className="sm:flex-1"
            />
            <Button type="submit" className="sm:min-w-32">
              {appCopy.deliveryHistory.search}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {FINAL_ORDER_STATUSES.map((value) => (
              <Button
                key={value}
                asChild
                variant={status === value ? "default" : "outline"}
              >
                <Link href={getHistoryHref(value, params.q)}>
                  {ORDER_STATUS_LABELS[value]}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {orders.map((order) => {
          const completedEvent = order.events[0];

          return (
            <Link key={order.id} href={`/delivery/orders/${order.id}`} className="block">
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
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Info label={appCopy.orderCard.phone} value={order.phone} />
                    <Info
                      label={appCopy.orderCard.quartier}
                      value={order.quartier || appCopy.orderCard.emptyValue}
                    />
                    <Info
                      label={appCopy.orderCard.amount}
                      value={formatMoney(order.amount)}
                    />
                    <Info
                      label={appCopy.orderCard.payment}
                      value={PAYMENT_TYPE_LABELS[order.paymentType]}
                    />
                    <Info
                      label={appCopy.deliveryHistory.statusLabel}
                      value={ORDER_STATUS_LABELS[order.status]}
                    />
                    <Info
                      label={appCopy.deliveryHistory.completedAt}
                      value={formatDateTime(
                        completedEvent?.createdAt ?? order.updatedAt,
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {appCopy.deliveryHistory.empty}
            </CardContent>
          </Card>
        ) : null}
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
