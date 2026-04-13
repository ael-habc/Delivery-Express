import Image from "next/image";
import Link from "next/link";

import { DeliveryNotifications } from "@/components/delivery-notifications";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { appCopy } from "@/lib/copy";
import { UserRole } from "@/src/generated/prisma";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const links =
    user.role === UserRole.ADMIN
      ? [
          { href: "/admin/dashboard", label: appCopy.nav.dashboard },
          { href: "/admin/orders", label: appCopy.nav.orders },
        ]
      : [{ href: "/delivery/orders", label: appCopy.nav.myOrders }];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Image
              src="/logo.png"
              alt={appCopy.app.logoAlt}
              width={128}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            <h1 className="text-lg font-semibold">
              {user.role === UserRole.ADMIN
                ? appCopy.app.adminTitle
                : `${appCopy.app.deliveryTitlePrefix}${user.name}`}
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            {links.map((link) => (
              <Button key={link.href} asChild variant="outline">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
            {user.role === UserRole.DELIVERY ? (
              <DeliveryNotifications userId={user.id} />
            ) : null}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
