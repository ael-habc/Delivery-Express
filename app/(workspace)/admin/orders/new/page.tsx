import { OrderForm } from "@/components/order-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeliveryUsers } from "@/lib/orders";

export default async function NewOrderPage() {
  const deliveryUsers = await getDeliveryUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nouvelle commande</h2>
        <p className="text-muted-foreground">
          Crée une commande confirmée et initialise sa timeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détails de la commande</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderForm mode="create" deliveryUsers={deliveryUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
