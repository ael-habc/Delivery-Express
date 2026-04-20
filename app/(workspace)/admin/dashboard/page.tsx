import Link from "next/link";

import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appCopy } from "@/lib/copy";
import { formatMoney, PAYMENT_TYPE_LABELS } from "@/lib/order-meta";
import { prisma } from "@/lib/prisma";
import { buildOrderSearchWhere, getDashboardStats } from "@/lib/orders";
import { OrderStatus } from "@/src/generated/prisma";

const DASHBOARD_FILTERS = [
  {
    key: "all",
    label: appCopy.adminDashboard.filters.all,
    getValue: (stats: Awaited<ReturnType<typeof getDashboardStats>>) => stats.totalOrders,
  },
  {
    key: OrderStatus.CONFIRMED,
    label: appCopy.adminDashboard.filters.confirmed,
    getValue: (stats: Awaited<ReturnType<typeof getDashboardStats>>) => stats.confirmed,
  },
  {
    key: OrderStatus.OUT_FOR_DELIVERY,
    label: appCopy.adminDashboard.filters.outForDelivery,
    getValue: (stats: Awaited<ReturnType<typeof getDashboardStats>>) => stats.outForDelivery,
  },
  {
    key: OrderStatus.DELIVERED,
    label: appCopy.adminDashboard.filters.delivered,
    getValue: (stats: Awaited<ReturnType<typeof getDashboardStats>>) => stats.delivered,
  },
  {
    key: OrderStatus.CANCELLED,
    label: appCopy.adminDashboard.filters.cancelled,
    getValue: (stats: Awaited<ReturnType<typeof getDashboardStats>>) => stats.cancelled,
  },
] as const;

function parseDashboardStatus(value?: string) {
  if (!value) {
    return undefined;
  }

  return Object.values(OrderStatus).includes(value as OrderStatus)
    ? (value as OrderStatus)
    : undefined;
}

function getDashboardHref(status?: OrderStatus, query?: string) {
  const params = new URLSearchParams();
  const q = query?.trim();

  if (status) {
    params.set("status", status);
  }

  if (q) {
    params.set("q", q);
  }

  const queryString = params.toString();
  return queryString ? `/admin/dashboard?${queryString}` : "/admin/dashboard";
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const activeStatus = parseDashboardStatus(params.status);
  const searchWhere = buildOrderSearchWhere(params.q);
  const ordersHeading = params.q
    ? appCopy.adminDashboard.searchResults
    : activeStatus
      ? appCopy.adminDashboard.filteredOrders
      : appCopy.adminDashboard.recentOrders;
  const allOrdersHref = params.q
    ? `/admin/orders?q=${encodeURIComponent(params.q)}`
    : "/admin/orders";

  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(),
    prisma.order.findMany({
      where: {
        ...(activeStatus ? { status: activeStatus } : {}),
        ...(searchWhere ? { AND: [searchWhere] } : {}),
      },
      take: searchWhere ? 20 : 5,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <div>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">
              {appCopy.adminDashboard.title}
            </h2>
            <p className="text-sm text-gray-500">
              {appCopy.adminDashboard.subtitle}
            </p>
          </div>

          <Button
            asChild
            className="rounded-lg bg-black px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-gray-800"
          >
            <Link href="/admin/orders/new">{appCopy.adminDashboard.newOrder}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {DASHBOARD_FILTERS.map((filter) => (
            <StatCard
              key={filter.key}
              label={filter.label}
              value={filter.getValue(stats)}
              href={getDashboardHref(
                filter.key === "all" ? undefined : filter.key,
                params.q
              )}
              active={
                filter.key === "all"
                  ? !activeStatus
                  : activeStatus === filter.key
              }
            />
          ))}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <form className="flex flex-col gap-3 sm:flex-row">
            {activeStatus ? (
              <input type="hidden" name="status" value={activeStatus} />
            ) : null}
            <Input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder={appCopy.adminDashboard.searchPlaceholder}
              className="sm:flex-1"
            />
            <Button type="submit" className="sm:min-w-32">
              {appCopy.adminDashboard.search}
            </Button>
            <Button asChild type="button" variant="outline" className="sm:min-w-32">
              <Link href={getDashboardHref(activeStatus)}>
                {appCopy.adminDashboard.clearSearch}
              </Link>
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {ordersHeading}
              </h3>
              {activeStatus ? (
                <p className="text-sm text-gray-500">
                  {appCopy.adminDashboard.activeFilter}{" "}
                  <StatusBadge status={activeStatus} />
                </p>
              ) : null}
            </div>
            <Link
              href={allOrdersHref}
              className="text-sm text-gray-500 transition-colors duration-200 hover:text-black"
            >
              {appCopy.adminDashboard.viewAll}
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className=" px-4 transition-all duration-200 hover:shadow-sm"
              >
                <div className="space-y-4 lg:hidden">
                  <div>
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-sm text-gray-500">
                      {order.orderNumber} - {order.phone}
                    </p>
                  </div>
                  
                  <div className="grid gap-2 text-sm text-gray-500 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-gray-700">
                        {appCopy.adminDashboard.quartier}:
                      </span>{" "}
                      {order.quartier || "-"}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        {appCopy.adminDashboard.payment}:
                      </span>{" "}
                      {PAYMENT_TYPE_LABELS[order.paymentType]}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        {appCopy.adminDashboard.amount}:
                      </span>{" "}
                      {formatMoney(order.amount)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">
                        {appCopy.adminDashboard.delivery}:
                      </span>{" "}
                      {order.assignedTo?.name || appCopy.adminDashboard.unassigned}
                    </p>
                  </div>

                  {order.address ? (
                    <p className="line-clamp-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        {appCopy.adminDashboard.address}:
                      </span>{" "}
                      {order.address}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={order.status} />
                    {order.createdAt ? (
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("fr-MA")}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_1.4fr_auto] items-center gap-4 lg:grid">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {order.customerName}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {order.orderNumber} - {order.phone}
                    </p>
                  </div>

                  <div className="min-w-0 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">
                      {appCopy.adminDashboard.quartier}
                    </p>
                    <p className="truncate">{order.quartier || "-"}</p>
                  </div>

                  <div className="min-w-0 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">
                      {appCopy.adminDashboard.payment}
                    </p>
                    <p>{PAYMENT_TYPE_LABELS[order.paymentType]}</p>
                  </div>

                  <div className="min-w-0 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">
                      {appCopy.adminDashboard.amount}
                    </p>
                    <p>{formatMoney(order.amount)}</p>
                  </div>

                  <div className="min-w-0 text-sm text-gray-500">
                    <p className="font-medium text-gray-700">
                      {appCopy.adminDashboard.deliveryAddress}
                    </p>
                    <p className="truncate">
                      {order.assignedTo?.name || appCopy.adminDashboard.unassigned}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {order.address || "-"}
                    </p>
                  </div>

                  <div className="flex min-w-[122px] flex-col items-end gap-2">
                    <StatusBadge status={order.status} />
                    {order.createdAt ? (
                      <span className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("fr-MA")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <hr className=" mt-2 h-1 "/>
              </Link>
            ))}

            {recentOrders.length === 0 ? (
              <div className="border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                {appCopy.adminDashboard.empty}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
