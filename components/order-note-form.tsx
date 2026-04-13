"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appCopy } from "@/lib/copy";
import { OrderEventType } from "@/src/generated/prisma";

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/orders/${orderId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: OrderEventType.NOTE,
        note,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      setError(result.details?.join(" ") || result.error || appCopy.orderNote.error);
      setIsSubmitting(false);
      return;
    }

    setNote("");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={appCopy.orderNote.placeholder}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || note.trim().length === 0}>
          {isSubmitting ? appCopy.orderNote.submitting : appCopy.orderNote.submit}
        </Button>
      </div>
    </form>
  );
}
