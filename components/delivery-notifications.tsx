"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type DeliveryNotificationOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  quartier: string | null;
  updatedAt: string;
};

export function DeliveryNotifications({ userId }: { userId: string }) {
  const [newOrders, setNewOrders] = useState<DeliveryNotificationOrder[]>([]);
  const initializedRef = useRef(false);
  const seenStorageKey = `delivery-notifications-seen-${userId}`;

  useEffect(() => {
    function syncNotifications(orders: DeliveryNotificationOrder[]) {
      const orderIds = orders.map((order) => order.id);
      const storedSeenIds = getSeenOrderIds(seenStorageKey);

      if (!initializedRef.current && storedSeenIds.length === 0) {
        localStorage.setItem(seenStorageKey, JSON.stringify(orderIds));
        initializedRef.current = true;
        return;
      }

      initializedRef.current = true;

      const unseenOrders = orders.filter(
        (order) => !storedSeenIds.includes(order.id),
      );

      setNewOrders(unseenOrders);
    }

    const eventSource = new EventSource("/api/delivery/notifications/stream");

    eventSource.onmessage = (event) => {
      try {
        const orders = JSON.parse(event.data) as DeliveryNotificationOrder[];
        syncNotifications(orders);
      } catch {
        setNewOrders([]);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [seenStorageKey]);

  function markOrdersSeen(orderIds: string[]) {
    const storedSeenIds = getSeenOrderIds(seenStorageKey);
    localStorage.setItem(
      seenStorageKey,
      JSON.stringify([...new Set([...storedSeenIds, ...orderIds])]),
    );
    setNewOrders((current) =>
      current.filter((order) => !orderIds.includes(order.id)),
    );
  }

  return (
    <div className="relative">
      <Button asChild variant="outline" className="relative">
        <Link href="/delivery/orders" aria-label="Notifications livraison">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
          {newOrders.length > 0 ? (
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-xs font-semibold text-white shadow-sm">
              {newOrders.length}
            </span>
          ) : null}
        </Link>
      </Button>

      {newOrders.length > 0 ? (
        <div className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-pink-100 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">
                Nouvelle commande assignee
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {newOrders.length === 1
                  ? "Une commande vient d'etre ajoutee a ton espace."
                  : `${newOrders.length} commandes viennent d'etre ajoutees a ton espace.`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Fermer la notification"
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => markOrdersSeen(newOrders.map((order) => order.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {newOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={`/delivery/orders/${order.id}`}
                className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-pink-50"
                onClick={() => markOrdersSeen([order.id])}
              >
                <span className="font-medium text-slate-950">
                  {order.orderNumber}
                </span>
                <span className="ml-2 text-slate-500">
                  {order.customerName}
                </span>
                {order.quartier ? (
                  <span className="block text-xs text-slate-400">
                    {order.quartier}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getSeenOrderIds(storageKey: string) {
  try {
    const storedValue = localStorage.getItem(storageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}
