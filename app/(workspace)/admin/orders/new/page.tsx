import { OrderForm } from "@/components/order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appCopy } from "@/lib/copy";
import { getDeliveryUsers } from "@/lib/orders";

export default async function NewOrderPage() {
  const deliveryUsers = await getDeliveryUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {appCopy.newOrder.title}
        </h2>
        <p className="text-muted-foreground">{appCopy.newOrder.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{appCopy.newOrder.details}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderForm mode="create" deliveryUsers={deliveryUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
