import React from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderItem {
  id: string;
  itemName: string;
  date: string;
  quantity: number;
  supplier: string;
}

interface Props {
  orders: OrderItem[];
  search: string;
  onSearch: (value: string) => void;
}

const InventoryOrderHistory: React.FC<Props> = ({ orders, search, onSearch }) => {
  const filtered = orders.filter((o) =>
    o.itemName.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search previous orders…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        <div className="max-h-60 overflow-y-auto border rounded-lg p-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching orders found.</p>
          )}

          {filtered.map((o) => (
            <div key={o.id} className="border-b py-2">
              <p className="font-medium">{o.itemName}</p>
              <p className="text-xs text-gray-500">
                {o.quantity} units • {o.supplier} • {o.date}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryOrderHistory;
