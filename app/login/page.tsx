import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getAuthSession } from "@/lib/auth";
import { UserRole } from "@/src/generated/prisma";

export default async function LoginPage() {
  const session = await getAuthSession();
  const callbackUrl = "/";

  if (session?.user?.role === UserRole.ADMIN) {
    redirect("/admin/dashboard");
  }

  if (session?.user?.role === UserRole.DELIVERY) {
    redirect("/delivery/orders");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#38bdf8_0%,#2563eb_24%,#7c3aed_62%,#ec4899_100%)] px-4 py-4 sm:px-6 sm:py-6">
      <main className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl items-center justify-center">
        <LoginForm callbackUrl={callbackUrl} />
      </main>
    </div>
  );
}
