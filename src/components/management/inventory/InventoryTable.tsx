import React, { useState, useEffect } from 'react';
import AddProductModal from './AddProductModal';
import ProductLogsModal from './ProductLogsModal';
import { Box } from 'lucide-react';
import getBaseUrl from '@/lib/config';

export interface Product {
  id: number;
  name: string;
  tag: string;
  image: string;
  unit: string;
  initialStock: number;
  unitPrice: number;
  location: string;
  logs: Array<{ type: 'add' | 'issue'; quantity: number; date: string }>;
}

// Backend inventory item type
type BackendInventoryItem = {
  last_updated: string;
  unit: string;
  threshold: number;
  Invent_id: string;
  category: string;
  stock: number;
  item: string;
  id?: string;
};

const tagColors: Record<string, string> = {
  harvest: 'bg-green-100 text-green-800',
  ploughing: 'bg-yellow-100 text-yellow-800',
  fertilizer: 'bg-blue-100 text-blue-800',
  irrigation: 'bg-cyan-100 text-cyan-800',
  electricity: 'bg-orange-100 text-orange-800',
  plumbing: 'bg-purple-100 text-purple-800',
};

const InventoryTable: React.FC = () => {
  const [products, setProducts] = useState<BackendInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [filterQuantity, setFilterQuantity] = useState('');

  // Fetch inventory items on mount
  useEffect(() => {
    setLoading(true);
    fetch(`${getBaseUrl()}/inventory_management/get_inventory_items`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch inventory items');
        return res.json();
      })
      .then(data => {
        console.log('Fetched inventory data:', data);
        setProducts(data.inventory_items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Inventory fetch error:', err);
        setError('Could not load inventory items.');
        setLoading(false);
      });
  }, []);

  // Filtered products
  const filteredProducts = products.filter(product => {
    let tagMatch = true;
    let quantityMatch = true;
    if (filterTag) tagMatch = product.category === filterTag;
    if (filterQuantity === 'in') quantityMatch = product.stock > 0;
    if (filterQuantity === 'out') quantityMatch = product.stock === 0;
    return tagMatch && quantityMatch;
  });

  const handleAddProduct = (product: Omit<Product, 'id' | 'logs'>) => {
    setProducts([
      ...products,
      { ...product, id: Date.now(), logs: [
        { type: 'add', quantity: product.initialStock, date: new Date().toISOString() }
      ] },
    ]);
    setShowAddModal(false);
  };

  const handleOpenLogs = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleAddLog = (productId: number, log: { type: 'add' | 'issue'; quantity: number; date: string }) => {
    setProducts(products.map(p =>
      p.id === productId ? { ...p, logs: [...p.logs, log] } : p
    ));
  };

  // Calculate summary stats
  const totalItems = products.length;
  const inStockItems = products.filter(p => p.stock > 0).length;
  const outOfStockItems = products.filter(p => p.stock === 0).length;
  // issuedItems not available from backend, set to 0 or remove if not needed
  const issuedItems = 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Add New Product button on top right */}
      <div className="flex justify-end mb-4">
        <button
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary-dark transition"
          onClick={() => setShowAddModal(true)}
        >
          + Add New Product
        </button>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-500 mb-1">Total Items</span>
          <span className="text-2xl font-bold text-primary">{totalItems}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-500 mb-1">In Stock</span>
          <span className="text-2xl font-bold text-green-600">{inStockItems}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-500 mb-1">Out of Stock</span>
          <span className="text-2xl font-bold text-red-600">{outOfStockItems}</span>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-500 mb-1">Issued Items</span>
          <span className="text-2xl font-bold text-yellow-600">{issuedItems}</span>
        </div>
      </div>
      {/* Filter options */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <label className="font-medium text-gray-700">Filter by Tag:</label>
          <select
            className="input input-bordered rounded px-3 py-2 border"
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
          >
            <option value="">All</option>
            {[...new Set(products.map(p => p.category))].map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label className="font-medium text-gray-700">Filter by Quantity:</label>
          <select
            className="input input-bordered rounded px-3 py-2 border"
            value={filterQuantity}
            onChange={e => setFilterQuantity(e.target.value)}
          >
            <option value="">All</option>
            <option value="in">In Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <span className="bg-primary-100 p-2 rounded-lg">
            <Box className="w-7 h-7 text-primary" />
          </span>
          <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        </div>
        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading inventory...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No products found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              return (
                <div
                  key={product.id || product.Invent_id}
                  className="bg-gray-50 rounded-xl shadow p-4 flex flex-col items-center border border-gray-100 relative cursor-pointer group"
                  // onClick, Add/Issue buttons can be implemented if backend supports
                >
                  {/* Category Tag Top Right */}
                  <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold shadow bg-gray-200 text-gray-700`}
                    style={{zIndex:2}}>
                    {product.category}
                  </span>
                  {/* Name */}
                  <div className="font-semibold text-lg mb-1 text-center">{product.item}</div>
                  {/* Stock */}
                  <div className="mb-3 text-sm">Stock: <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>{product.stock} {product.unit}</span></div>
                  {/* Last Updated */}
                  <div className="mb-2 text-xs text-gray-500">Last updated: {new Date(product.last_updated).toLocaleString()}</div>
                  {/* Threshold */}
                  <div className="mb-2 text-xs text-gray-500">Threshold: {product.threshold}</div>
                  {/* Location (if available) */}
                  {product.location && <div className="mb-2 text-xs text-gray-500">Location: {product.location}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddProduct}
        />
      )}
      {/* Product Details Popup */}
      {selectedProduct && selectedProduct._showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 relative animate-fade-in">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            <h3 className="text-2xl font-bold mb-4 text-primary">{selectedProduct.name}</h3>
            <img src={selectedProduct.image} alt={selectedProduct.name} className="w-32 h-32 object-cover rounded-xl border mb-4 mx-auto" />
            <div className="mb-2"><span className="font-semibold">Category:</span> {selectedProduct.tag.charAt(0).toUpperCase() + selectedProduct.tag.slice(1)}</div>
            <div className="mb-2"><span className="font-semibold">Unit:</span> {selectedProduct.unit}</div>
            <div className="mb-2"><span className="font-semibold">Unit Price:</span> ₹{selectedProduct.unitPrice}</div>
            <div className="mb-2"><span className="font-semibold">Location:</span> {selectedProduct.location}</div>
            <div className="mb-2"><span className="font-semibold">Initial Stock:</span> {selectedProduct.initialStock}</div>
            <div className="mb-2"><span className="font-semibold">Current Stock:</span> {selectedProduct.logs.reduce((acc, log) => log.type === 'add' ? acc + log.quantity : acc - log.quantity, 0)}</div>
            <div className="flex justify-end mt-6">
              <button className="bg-primary text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-primary-dark transition" onClick={() => setSelectedProduct(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Product Logs Modal */}
      {selectedProduct && !selectedProduct._showDetails && (
        <ProductLogsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddLog={handleAddLog}
          defaultLogType={selectedProduct._logType}
        />
      )}
    </div>
  );
};

export default InventoryTable;
