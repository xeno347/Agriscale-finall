import React, { useState } from 'react';
import { Product } from './InventoryTable';

interface ProductLogsModalProps {
  product: Product & { _logType?: 'add' | 'issue' };
  onClose: () => void;
  onAddLog: (productId: number, log: { type: 'add' | 'issue'; quantity: number; date: string }) => void;
  defaultLogType?: 'add' | 'issue';
}

const ProductLogsModal: React.FC<ProductLogsModalProps> = ({ product, onClose, onAddLog, defaultLogType }) => {
  const [type, setType] = useState<'add' | 'issue'>(defaultLogType || product._logType || 'add');
  const [quantity, setQuantity] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onAddLog(product.id, { type, quantity, date: new Date().toISOString() });
      setQuantity(0);
    }
  };

  const total = product.logs.reduce((acc, log) =>
    log.type === 'add' ? acc + log.quantity : acc - log.quantity, 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <h3 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
          Logs - {product.name}
        </h3>
        <div className="mb-3 text-base">Current Quantity: <span className="font-semibold text-primary">{total}</span></div>
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2 mb-2">
            <select className="input input-bordered rounded px-3 py-2 border" value={type} onChange={e => setType(e.target.value as 'add' | 'issue')}>
              <option value="add">Add</option>
              <option value="issue">Issue</option>
            </select>
            <input
              type="number"
              className="input input-bordered rounded px-3 py-2 border"
              value={quantity}
              min={1}
              onChange={e => setQuantity(Number(e.target.value))}
              required
            />
            <button type="submit" className="bg-primary text-white px-4 py-2 rounded shadow hover:bg-primary-dark transition">Log</button>
          </div>
        </form>
        <div className="mb-2">
          <h4 className="font-semibold mb-1">Logs</h4>
          <ul className="max-h-32 overflow-y-auto divide-y divide-gray-100">
            {product.logs.length === 0 && <li className="text-gray-400 text-sm py-2">No logs yet.</li>}
            {product.logs.map((log, idx) => (
              <li key={idx} className="text-sm py-1">
                <span className={log.type === 'add' ? 'text-green-600' : 'text-red-600'}>
                  [{new Date(log.date).toLocaleString()}] {log.type === 'add' ? '+' : '-'}{log.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ProductLogsModal;
