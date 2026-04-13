"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Volume2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { appCopy } from "@/lib/copy";

type DeliveryNotificationOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  quartier: string | null;
  updatedAt: string;
};

export function DeliveryNotifications({ userId }: { userId: string }) {
  const seenStorageKey = `delivery-notifications-seen-${userId}`;
  const soundStorageKey = `delivery-notifications-sound-${userId}`;
  const [newOrders, setNewOrders] = useState<DeliveryNotificationOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(soundStorageKey) === "true",
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const initializedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);

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

      if (unseenOrders.length > 0) {
        triggerMobileAlert(unseenOrders, soundEnabledRef.current, audioContextRef);
      }

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

  async function enableNotificationSound() {
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    localStorage.setItem(soundStorageKey, "true");

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const audioContext = getAudioContext(audioContextRef);

    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }

    playNotificationRing(audioContextRef);
  }

  return (
    <div className="relative">
      <Button asChild variant="outline" className="relative">
        <Link href="/delivery/orders" aria-label={appCopy.notifications.buttonAria}>
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">{appCopy.notifications.buttonLabel}</span>
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
                {appCopy.notifications.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {newOrders.length === 1
                  ? appCopy.notifications.singleBody
                  : appCopy.notifications.multipleBody.replace(
                      "{count}",
                      String(newOrders.length),
                    )}
              </p>
            </div>
            <button
              type="button"
              aria-label={appCopy.notifications.closeAria}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              onClick={() => markOrdersSeen(newOrders.map((order) => order.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {!soundEnabled ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-50 px-3 py-2 text-sm font-medium text-pink-700 transition-colors hover:bg-pink-100"
                onClick={enableNotificationSound}
              >
                <Volume2 className="h-4 w-4" />
                {appCopy.notifications.enableSound}
              </button>
            ) : null}

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

function triggerMobileAlert(
  orders: DeliveryNotificationOrder[],
  soundEnabled: boolean,
  audioContextRef: React.RefObject<AudioContext | null>,
) {
  if ("vibrate" in navigator) {
    navigator.vibrate([250, 120, 250]);
  }

  if (soundEnabled) {
    playNotificationRing(audioContextRef);
  }

  if (
    "Notification" in window &&
    document.hidden &&
    Notification.permission === "granted"
  ) {
    const firstOrder = orders[0];
    const extraCount = orders.length > 1 ? ` +${orders.length - 1}` : "";

    new Notification(appCopy.notifications.title, {
      body: `${firstOrder.orderNumber} - ${firstOrder.customerName}${extraCount}`,
      tag: firstOrder.id,
    });
  }
}

function getAudioContext(audioContextRef?: React.RefObject<AudioContext | null>) {
  if (audioContextRef?.current) {
    return audioContextRef.current;
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  const audioContext = new AudioContextConstructor();

  if (audioContextRef) {
    audioContextRef.current = audioContext;
  }

  return audioContext;
}

function playNotificationRing(
  audioContextRef?: React.RefObject<AudioContext | null>,
) {
  const audioContext = audioContextRef?.current;

  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const now = audioContext.currentTime;

  [0, 0.28].forEach((offset) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now + offset);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.2);
  });
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
