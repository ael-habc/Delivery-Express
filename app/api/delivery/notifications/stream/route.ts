import { jsonError } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { ACTIVE_ORDER_STATUSES } from "@/lib/order-meta";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/src/generated/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 5000;

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id || session.user.role !== UserRole.DELIVERY) {
    return jsonError("Unauthorized.", 401);
  }

  const deliveryUserId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload = "";

      async function sendOrders() {
        if (request.signal.aborted) return;

        const orders = await prisma.order.findMany({
          where: {
            assignedToId: deliveryUserId,
            status: { in: [...ACTIVE_ORDER_STATUSES] },
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            quartier: true,
            updatedAt: true,
          },
        });

        const payload = JSON.stringify(orders);

        if (payload === lastPayload) return;

        lastPayload = payload;
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }

      await sendOrders();
      const intervalId = setInterval(sendOrders, POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
