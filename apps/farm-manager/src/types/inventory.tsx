export interface InventoryItem {
  id: string;
  itemName: string;
  category: string;
  sku: string;
  unit: string;
  currentStock: number;
  minStock: number;
  cost: number;
  supplier: string;
  description?: string;
  purchaseDate?: string;
  expiryDate?: string;
}
