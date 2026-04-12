import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { ACTIVE_ORDER_STATUSES } from "@/lib/order-meta";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/src/generated/prisma";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id || session.user.role !== UserRole.DELIVERY) {
    return jsonError("Unauthorized.", 401);
  }

  const orders = await prisma.order.findMany({
    where: {
      assignedToId: session.user.id,
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

  return NextResponse.json({ ok: true, data: orders });
}
