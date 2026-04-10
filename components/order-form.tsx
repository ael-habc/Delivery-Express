"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import quartiers from "@/lib/quartiers.json";
import { PAYMENT_TYPE_LABELS } from "@/lib/order-meta";
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
        result.details?.join(" ") || result.error || "Une erreur est survenue.",
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
        <Field label="Numéro de commande">
          <Input
            value={values.orderNumber}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                orderNumber: event.target.value,
              }))
            }
            placeholder="CMD-001"
            disabled={mode === "update"}
          />
        </Field>
        <Field label="Nom client">
          <Input
            value={values.customerName}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                customerName: event.target.value,
              }))
            }
            placeholder="Nom complet"
          />
        </Field>
        <Field label="Téléphone">
          <Input
            value={values.phone}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            placeholder="06..."
          />
        </Field>
        <Field label="Quartier">
          <Select
            value={values.quartier}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                quartier: event.target.value,
              }))
            }
          >
            <option value="">Choisir un quartier</option>
            {quartiers.map((quartier) => (
              <option key={quartier} value={quartier}>
                {quartier}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Montant">
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
        <Field label="Type de paiement">
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

      <Field label="Livreur assigné">
        <Select
          value={values.assignedToId}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              assignedToId: event.target.value,
            }))
          }
        >
          <option value="">Non assigné</option>
          {deliveryUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Adresse">
        <Textarea
          value={values.address}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              address: event.target.value,
            }))
          }
          placeholder="Repère, immeuble, étage..."
        />
      </Field>

      <Field label="Note">
        <Textarea
          value={values.note}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              note: event.target.value,
            }))
          }
          placeholder="Informations internes"
        />
      </Field>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end mt-2">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting
            ? "Enregistrement..."
            : mode === "create"
              ? "Créer la commande"
              : "Mettre à jour"}
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
