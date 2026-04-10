import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const usersCount = await prisma.user.count();
    const ordersCount = await prisma.order.count();

    return NextResponse.json({
      ok: true,
      usersCount,
      ordersCount,
    });
  } catch (error) {
    console.error("DB test failed:", error);
    return NextResponse.json(
      { ok: false, error: "Database connection failed" },
      { status: 500 }
    );
  }
}