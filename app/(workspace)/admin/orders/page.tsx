import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { appCopy } from "@/lib/copy";
import {
  formatMoney,
  ORDER_STATUS_BAR_CLASSES,
  ORDER_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/order-meta";
import { parseStatus } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { OrderStatus, type Prisma } from "@/src/generated/prisma";

type OrdersSearchParams = {
  status?: string;
  minAmount?: string;
  maxAmount?: string;
  dateFrom?: string;
  dateTo?: string;
};

function parseAmount(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDateBoundary(value?: string, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildOrdersWhere(params: OrdersSearchParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const status = parseStatus(params.status ?? null);
  const minAmount = parseAmount(params.minAmount);
  const maxAmount = parseAmount(params.maxAmount);
  const dateFrom = parseDateBoundary(params.dateFrom);
  const dateTo = parseDateBoundary(params.dateTo, true);

  if (status && status !== "invalid") {
    where.status = status;
  }

  if (minAmount !== undefined || maxAmount !== undefined) {
    where.amount = {};
    if (minAmount !== undefined) where.amount.gte = minAmount;
    if (maxAmount !== undefined) where.amount.lte = maxAmount;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  return where;
}

function getDailyChartData(
  orders: Array<{ createdAt: Date }>,
  dateFrom?: string,
  dateTo?: string
): Array<{ label: string; count: number }> {
  const formatter = new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "2-digit",
  });

  const fallbackEndDate = dateTo ? parseDateBoundary(dateTo, true) : new Date();

  const fallbackStartDate = new Date(fallbackEndDate ?? new Date());
  fallbackStartDate.setDate(fallbackStartDate.getDate() - 5);

  const startDate = dateFrom
    ? parseDateBoundary(dateFrom)
    : fallbackStartDate;
  const endDate = fallbackEndDate;

  const safeStartDate = new Date(startDate ?? new Date());
  const safeEndDate = new Date(endDate ?? new Date());

  safeStartDate.setHours(0, 0, 0, 0);
  safeEndDate.setHours(0, 0, 0, 0);

  if (safeStartDate.getTime() > safeEndDate.getTime()) {
    return [];
  }

  const daysDiff =
    Math.floor(
      (safeEndDate.getTime() - safeStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  const chartDays = Math.min(Math.max(daysDiff, 1), 31);
  const days = Array.from({ length: chartDays }, (_, index) => {
    const date = new Date(safeStartDate);
    date.setDate(safeStartDate.getDate() + index);
    date.setHours(0, 0, 0, 0);
    const key = getLocalDateKey(date);
    return {
      key,
      label: formatter.format(date),
      count: 0,
    };
  });

  const countMap = new Map(days.map((day) => [day.key, day]));

  for (const order of orders) {
    const key = getLocalDateKey(order.createdAt);
    const day = countMap.get(key);
    if (day) day.count += 1;
  }

  return days.map(({ label, count }) => ({ label, count }));
}

function getStatusChartData(orders: Array<{ status: OrderStatus }>) {
  return Object.values(OrderStatus).map((status) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    count: orders.filter((order) => order.status === status).length,
  }));
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSearchParams>;
}) {
  const params = await searchParams;
  const where = buildOrdersWhere(params);

  const orders = await prisma.order.findMany({
    where,
    include: {
      assignedTo: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  const dailyChartData = getDailyChartData(orders, params.dateFrom, params.dateTo);
  const statusChartData = getStatusChartData(orders);
  const maxDailyCount = Math.max(...dailyChartData.map((item) => item.count), 1);
  const maxStatusCount = Math.max(...statusChartData.map((item) => item.count), 1);

  return (
    <div className="space-y-6 bg-gray-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {appCopy.adminOrders.title}
          </h2>
          <p className="text-sm text-gray-500">
            {appCopy.adminOrders.subtitle}
          </p>
        </div>
        <Button
          asChild
          className="rounded-lg bg-black px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-gray-800"
        >
          <Link href="/admin/orders/new">{appCopy.adminOrders.create}</Link>
        </Button>
      </div>

      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            {appCopy.adminOrders.filters}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Select name="status" defaultValue={params.status ?? ""}>
              <option value="">{appCopy.adminOrders.allStatuses}</option>
              {Object.values(OrderStatus).map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              step="0.01"
              min="0"
              name="minAmount"
              defaultValue={params.minAmount ?? ""}
              placeholder={appCopy.adminOrders.minAmount}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              name="maxAmount"
              defaultValue={params.maxAmount ?? ""}
              placeholder={appCopy.adminOrders.maxAmount}
            />
            <Input
              type="date"
              name="dateFrom"
              defaultValue={params.dateFrom ?? ""}
            />
            <Input
              type="date"
              name="dateTo"
              defaultValue={params.dateTo ?? ""}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 rounded-lg bg-black text-white hover:bg-gray-800">
                {appCopy.adminOrders.filter}
              </Button>
              <Button asChild type="button" variant="outline" className="flex-1 rounded-lg">
                <Link href="/admin/orders">{appCopy.adminOrders.reset}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label={appCopy.adminOrders.visibleOrders}
          value={String(orders.length)}
        />
        <SummaryCard
          label={appCopy.adminOrders.totalAmount}
          value={formatMoney(totalAmount)}
        />
        <SummaryCard
          label={appCopy.adminOrders.period}
          value={
            params.dateFrom || params.dateTo
              ? appCopy.adminOrders.filterActive
              : appCopy.adminOrders.allDates
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              {appCopy.adminOrders.statusDistribution}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusChartData.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                  </div>
                  <span className="font-medium text-gray-900">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${ORDER_STATUS_BAR_CLASSES[item.status]}`}
                    style={{
                      width: `${(item.count / maxStatusCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">
              {appCopy.adminOrders.ordersByDay}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <div className="flex h-56 items-end gap-3 overflow-x-auto">
                {dailyChartData.map((item) => (
                  <div
                    key={item.label}
                    className="flex min-w-10 flex-1 flex-col items-center gap-2"
                  >
                    <div className="text-xs font-medium text-gray-500">{item.count}</div>
                    <div className="flex h-40 w-full items-end rounded-xl bg-gray-50 px-1 py-1">
                      <div
                        className="w-full rounded-lg bg-gray-900 transition-all duration-200"
                        style={{
                          height: `${Math.max((item.count / maxDailyCount) * 100, item.count > 0 ? 10 : 0)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                {appCopy.adminOrders.noDailyData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            {appCopy.adminOrders.ordersList}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-100 lg:block">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.order}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.client}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.quartier}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.amount}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.payment}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.date}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.status}</th>
                  <th className="px-4 py-3 font-medium">{appCopy.adminOrders.columns.delivery}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-gray-900 hover:text-black"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{order.customerName}</div>
                      <div className="text-gray-500">{order.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.quartier || "-"}</td>
                    <td className="px-4 py-3 text-gray-900">{formatMoney(order.amount)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {PAYMENT_TYPE_LABELS[order.paymentType]}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {order.createdAt.toLocaleDateString("fr-MA")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {order.assignedTo?.name || appCopy.adminOrders.unassigned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="rounded-2xl border border-gray-100 bg-white p-4 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                      {order.orderNumber}
                    </p>
                    <p className="font-medium text-gray-900">{order.customerName}</p>
                    <p className="text-sm text-gray-500">{order.phone}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info
                    label={appCopy.adminOrders.columns.quartier}
                    value={order.quartier || "-"}
                  />
                  <Info
                    label={appCopy.adminOrders.columns.amount}
                    value={formatMoney(order.amount)}
                  />
                  <Info
                    label={appCopy.adminOrders.columns.payment}
                    value={PAYMENT_TYPE_LABELS[order.paymentType]}
                  />
                  <Info
                    label={appCopy.adminOrders.columns.date}
                    value={order.createdAt.toLocaleDateString("fr-MA")}
                  />
                </div>
              </Link>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              {appCopy.adminOrders.empty}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}
