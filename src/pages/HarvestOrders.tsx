import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HarvestOrder } from '@/types/farm';
import { useToast } from '@/hooks/use-toast';
import getBaseUrl from '@/lib/config';

const HarvestOrders = () => {
  const [orders, setOrders] = useState<HarvestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const base = getBaseUrl();
      const resp = await fetch(`${base.replace(/\/$/, '')}/harvest/get_orders`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);

      const result = await resp.json();
      console.log('Raw API response:', result);

      const transformed: HarvestOrder[] = (result.orders || []).map((item: any) => ({
        id: item.id || item.order_id,
        farmerId: item.farmer_id,
        farmerName: item.farmer_name || 'Unknown',
        cropType: item.crop_type || 'N/A',
        quantity: item.quantity,
        quantityUnit: item.quantity_unit || 'kg',
        orderDate: item.order_date,
        expectedDeliveryDate: item.expected_delivery_date,
        buyerName: item.buyer_name,
        price: item.price,
        totalAmount: item.total_amount,
        notes: item.notes,
        status: item.status || 'pending',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setOrders(transformed);
      toast({
        title: 'Success',
        description: `Loaded ${transformed.length} harvest orders`,
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast({
        title: 'Error',
        description: `Failed to load orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.buyerName && order.buyerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    inProgress: orders.filter(o => o.status === 'in-progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const getStatusColor = (status: HarvestOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Harvest Orders</h1>
          <p className="text-muted-foreground mt-1">Manage harvest orders and buyer interactions</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: 'Pending', value: stats.pending, color: 'bg-gray-100 text-gray-800' },
          { label: 'Confirmed', value: stats.confirmed, color: 'bg-info/10 text-info' },
          { label: 'In Progress', value: stats.inProgress, color: 'bg-warning/10 text-warning' },
          { label: 'Completed', value: stats.completed, color: 'bg-success/10 text-success' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl p-4 shadow-card border border-border">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color.split(' ')[1]}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by farmer, crop, or buyer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="px-6 py-3 text-left text-sm font-semibold">Farmer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Crop Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Buyer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Delivery Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className="border-b border-border hover:bg-secondary/50 transition">
                  <td className="px-6 py-4">
                    <p className="font-medium">{order.farmerName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{order.cropType}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">
                      {order.quantity} {order.quantityUnit}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{order.buyerName || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">
                      {order.totalAmount ? `₹${order.totalAmount.toLocaleString()}` : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">
                      {order.expectedDeliveryDate
                        ? new Date(order.expectedDeliveryDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredOrders.length === 0 && !loading && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No harvest orders found</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery ? 'Try adjusting your search' : 'Create your first harvest order'}
          </p>
        </div>
      )}
    </div>
  );
};

export default HarvestOrders;
