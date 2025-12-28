import React from 'react';
import InventoryTable from '../components/management/inventory/InventoryTable';

const Inventory: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Inventory</h1>
      <p className="text-gray-600 mb-6">Manage stocks and issuing of products from this module.</p>
      <InventoryTable />
    </div>
  );
};

export default Inventory;
