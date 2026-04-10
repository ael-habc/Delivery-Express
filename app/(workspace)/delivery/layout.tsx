import { requireDeliveryUser } from "@/lib/auth";

export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDeliveryUser();
  return children;
}
