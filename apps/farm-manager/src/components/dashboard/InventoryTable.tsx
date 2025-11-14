import { InventoryItem } from "@/types/inventory";

interface InventoryTableProps {
  items: InventoryItem[];
}

export const InventoryTable = ({ items }: InventoryTableProps) => {
  return (
    <table className="w-full text-sm border">
      <thead>
        <tr className="bg-gray-100 border-b">
          <th className="p-2">Item Name</th>
          <th className="p-2">Category</th>
          <th className="p-2">SKU</th>
          <th className="p-2">Stock</th>
          <th className="p-2">Purchase Date</th>
          <th className="p-2">Expiry Date</th>
        </tr>
      </thead>

      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b">
            <td className="p-2">{item.itemName}</td>
            <td className="p-2">{item.category}</td>
            <td className="p-2">{item.sku}</td>
            <td className="p-2">{item.currentStock}</td>
            <td className="p-2">{item.purchaseDate || "--"}</td>
            <td className="p-2">{item.expiryDate || "--"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
