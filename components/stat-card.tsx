import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  href,
  active = false,
}: {
  label: string;
  value: number;
  href?: string;
  active?: boolean;
}) {
  const content = (
    <Card
      className={cn(
        "rounded-2xl border shadow-sm transition-all duration-200",
        active
          ? "border-fuchsia-200 bg-fuchsia-50 shadow-md"
          : "border-gray-100 bg-white hover:shadow-md"
      )}
    >
      <CardHeader className="p-5 pb-2">
        <CardTitle
          className={cn(
            "text-sm font-medium",
            active ? "text-fuchsia-700" : "text-gray-500"
          )}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div
          className={cn(
            "text-2xl font-bold",
            active ? "text-fuchsia-900" : "text-gray-900"
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
