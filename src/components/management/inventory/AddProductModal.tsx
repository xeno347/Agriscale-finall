import React, { useState } from 'react';

interface AddProductModalProps {
  onClose: () => void;
  onAdd: (product: {
    name: string;
    tag: string;
    image: string;
    unit: string;
    initialStock: number;
    unitPrice: number;
    location: string;
  }) => void;
}

const tags = [
  'harvest',
  'ploughing',
  'Fertilizers',
  'irrigation',
  'electricity',
  'plumbing',
  'Seeds',
  'Fuel'

];


const units = ['KG', 'ml', 'quantity'];
const locations = ['Warehouse 1', 'Warehouse 2', 'Warehouse 3'];

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [tag, setTag] = useState(tags[0]);
  const [image, setImage] = useState('');
  const [unit, setUnit] = useState(units[0]);
  const [initialStock, setInitialStock] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [location, setLocation] = useState(locations[0]);
  const [dragActive, setDragActive] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !image || !unit || !location || initialStock < 0 || unitPrice < 0) return;
    onAdd({ name, tag, image, unit, initialStock, unitPrice, location });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        <h3 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
          <span className="bg-primary-100 p-2 rounded-lg"><svg width="24" height="24" fill="none"><rect width="24" height="24" rx="6" fill="#4F46E5" fillOpacity=".1"/></svg></span>
          Add New Product
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block mb-2 font-semibold text-gray-700">Product Image</label>
            <label
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition p-6 ${dragActive ? 'border-primary bg-primary-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {image ? (
                <img src={image} alt="Preview" className="w-28 h-28 object-cover rounded-xl border mb-2 shadow" />
              ) : (
                <>
                  <span className="text-4xl text-gray-300 mb-2">📷</span>
                  <span className="text-gray-500 text-sm mb-1">Drag & drop or click to upload</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} required className="hidden" />
            </label>
          </div>
          <div className="mb-5">
            <label className="block mb-2 font-semibold text-gray-700">Product Name</label>
            <input className="input input-bordered w-full rounded-lg px-4 py-2 border text-base" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter product name" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Product Tag</label>
              <select className="input input-bordered w-full rounded-lg px-4 py-2 border text-base" value={tag} onChange={e => setTag(e.target.value)}>
                {tags.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Unit</label>
              <select className="input input-bordered w-full rounded-lg px-4 py-2 border text-base" value={unit} onChange={e => setUnit(e.target.value)}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Initial Stock</label>
              <input type="number" min={0} className="input input-bordered w-full rounded-lg px-4 py-2 border text-base" value={initialStock} onChange={e => setInitialStock(Number(e.target.value))} required placeholder="Enter initial stock" />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Unit Price (in Rs)</label>
              <input type="number" min={0} className="input input-bordered w-full rounded-lg px-4 py-2 border text-base" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} required placeholder="Enter unit price" />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-gray-700">Location</label>
              <select className="input input-bordered w-full rounded-lg px-4 py-2 border text-base" value={location} onChange={e => setLocation(e.target.value)}>
                {locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-200 transition" onClick={onClose}>Cancel</button>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-primary-dark transition">Add Product</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
