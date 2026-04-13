"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appCopy } from "@/lib/copy";
import { PAYMENT_TYPE_LABELS } from "@/lib/order-meta";
import quartiers from "@/lib/quartiers.json";
import { PaymentType, type User } from "@/src/generated/prisma";

type DeliveryUserOption = Pick<User, "id" | "name" | "email">;

type OrderFormValues = {
  orderNumber: string;
  customerName: string;
  phone: string;
  quartier: string;
  address: string;
  note: string;
  amount: string;
  paymentType: PaymentType;
  assignedToId: string;
};

type OrderFormProps = {
  mode: "create" | "update";
  deliveryUsers: DeliveryUserOption[];
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    quartier: string | null;
    address: string | null;
    note: string | null;
    amount: number;
    paymentType: PaymentType;
    assignedToId: string | null;
  };
};

export function OrderForm({ mode, deliveryUsers, order }: OrderFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo<OrderFormValues>(
    () => ({
      orderNumber: order?.orderNumber ?? "",
      customerName: order?.customerName ?? "",
      phone: order?.phone ?? "",
      quartier: order?.quartier ?? "",
      address: order?.address ?? "",
      note: order?.note ?? "",
      amount: order ? String(order.amount) : "",
      paymentType: order?.paymentType ?? PaymentType.COD,
      assignedToId: order?.assignedToId ?? "",
    }),
    [order],
  );

  const [values, setValues] = useState<OrderFormValues>(initialValues);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      ...values,
      amount: Number(values.amount),
      assignedToId: values.assignedToId || null,
    };

    const endpoint =
      mode === "create" ? "/api/orders" : `/api/orders/${order?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      ok: boolean;
      error?: string;
      details?: string[];
      data?: { id: string };
    };

    if (!response.ok || !result.ok) {
      setError(
        result.details?.join(" ") || result.error || appCopy.orderForm.error,
      );
      setIsSubmitting(false);
      return;
    }

    if (mode === "create" && result.data?.id) {
      router.push(`/admin/orders/${result.data.id}`);
      return;
    }

    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={appCopy.orderForm.fields.orderNumber}>
          <Input
            value={values.orderNumber}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                orderNumber: event.target.value,
              }))
            }
            placeholder={appCopy.orderForm.placeholders.orderNumber}
            disabled={mode === "update"}
          />
        </Field>
        <Field label={appCopy.orderForm.fields.customerName}>
          <Input
            value={values.customerName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                customerName: event.target.value,
              }))
            }
            placeholder={appCopy.orderForm.placeholders.customerName}
          />
        </Field>
        <Field label={appCopy.orderForm.fields.phone}>
          <Input
            value={values.phone}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            placeholder={appCopy.orderForm.placeholders.phone}
          />
        </Field>
        <Field label={appCopy.orderForm.fields.quartier}>
          <Select
            value={values.quartier}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                quartier: event.target.value,
              }))
            }
          >
            <option value="">{appCopy.orderForm.placeholders.quartier}</option>
            {quartiers.map((quartier) => (
              <option key={quartier} value={quartier}>
                {quartier}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={appCopy.orderForm.fields.amount}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                amount: event.target.value,
              }))
            }
            placeholder="0.00"
          />
        </Field>
        <Field label={appCopy.orderForm.fields.paymentType}>
          <Select
            value={values.paymentType}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                paymentType: event.target.value as PaymentType,
              }))
            }
          >
            {Object.values(PaymentType).map((paymentType) => (
              <option key={paymentType} value={paymentType}>
                {PAYMENT_TYPE_LABELS[paymentType]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={appCopy.orderForm.fields.assignedTo}>
        <Select
          value={values.assignedToId}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              assignedToId: event.target.value,
            }))
          }
        >
          <option value="">{appCopy.orderForm.unassigned}</option>
          {deliveryUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={appCopy.orderForm.fields.address}>
        <Textarea
          value={values.address}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              address: event.target.value,
            }))
          }
          placeholder={appCopy.orderForm.placeholders.address}
        />
      </Field>

      <Field label={appCopy.orderForm.fields.note}>
        <Textarea
          value={values.note}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
          placeholder={appCopy.orderForm.placeholders.note}
        />
      </Field>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-2 flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? appCopy.orderForm.saving
            : mode === "create"
              ? appCopy.orderForm.create
              : appCopy.orderForm.update}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
