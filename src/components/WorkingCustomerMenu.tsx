/**
 * Customer Menu Component - Complete working version
 * Displays menu, allows ordering, and handles payment
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Check } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  current_stock: number;
}

interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface MenuProps {
  ownerId: string;
  tableNumber?: number;
}

export const WorkingCustomerMenu: React.FC<MenuProps> = ({ ownerId, tableNumber }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [showOrderPlaced, setShowOrderPlaced] = useState(false);

  // 1. Fetch menu items
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('owner_id', ownerId)
          .eq('is_available', true)
          .gt('current_stock', 0);

        if (error) throw error;
        
        setMenuItems(data || []);
      } catch (error) {
        console.error('Menu fetch error:', error);
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    if (ownerId) fetchMenu();
  }, [ownerId]);

  // 2. Add to cart
  const addToCart = (item: MenuItem) => {
    if (item.current_stock <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        return prev.map(c =>
          c.item_id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, {
        item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      }];
    });
    toast.success(`Added ${item.name} to cart`);
  };

  // 3. Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  // 4. Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  // 5. Place order
  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setPlacing(true);
    try {
      // 1. Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          owner_id: ownerId,
          table_number: tableNumber,
          status: 'new',
          subtotal,
          tax_amount: tax,
          total_amount: total,
          order_type: 'qr_scan',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order creation failed');

      // 2. Add order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.price,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Create payment link
      const { data: linkData, error: linkError } = await supabase.rpc(
        'create_payment_link_rpc',
        {
          p_order_id: orderData.id,
          p_owner_id: ownerId,
          p_amount: total,
          p_customer_name: `Table ${tableNumber || 'Online'}`,
          p_customer_phone: 'N/A',
          p_customer_email: 'customer@restaurant.local'
        }
      );

      if (linkError) throw linkError;

      // 4. Clear cart and show success
      setCart([]);
      setShowOrderPlaced(true);
      toast.success('Order placed! Waiting for payment...');

      // Reset after 3 seconds
      setTimeout(() => {
        setShowOrderPlaced(false);
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading menu...</div>;
  }

  if (showOrderPlaced) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-900 mb-2">Order Placed!</h1>
          <p className="text-green-700">Proceed to payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Menu Section */}
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Menu</h1>

        {/* Menu Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {menuItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-40 object-cover rounded mb-4"
                />
              )}
              <div className="mb-2">
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-blue-600">₹{item.price}</span>
                {item.current_stock > 0 ? (
                  <Badge variant="outline" className="bg-green-50">
                    In Stock
                  </Badge>
                ) : (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
              </div>
              <Button
                onClick={() => addToCart(item)}
                disabled={item.current_stock <= 0}
                className="w-full"
              >
                Add to Cart
              </Button>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
            <div className="max-w-6xl mx-auto p-6">
              <div className="grid md:grid-cols-3 gap-6 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-lg font-semibold">₹{subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tax (5%)</p>
                  <p className="text-lg font-semibold">₹{tax.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">₹{total.toFixed(2)}</p>
                </div>
              </div>

              {/* Cart Items */}
              <div className="mb-4 max-h-32 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.item_id} className="flex justify-between items-center py-2 border-t">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × ₹{item.price} = ₹{(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromCart(item.item_id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={placeOrder}
                disabled={placing}
                className="w-full h-12 text-lg"
              >
                <ShoppingCart className="mr-2 w-5 h-5" />
                {placing ? 'Placing Order...' : 'Place Order & Pay'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingCustomerMenu;
