import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { UserRole } from "@/src/generated/prisma";

export default async function Home() {
  const session = await getAuthSession();

  if (session?.user?.role === UserRole.ADMIN) {
    redirect("/admin/dashboard");
  }

  if (session?.user?.role === UserRole.DELIVERY) {
    redirect("/delivery/orders");
  }

  redirect("/login");
}
