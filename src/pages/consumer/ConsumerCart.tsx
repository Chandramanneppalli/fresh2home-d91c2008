import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Minus, Plus, CreditCard, Truck, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import freshProduce from '@/assets/fresh-produce.jpg';

interface CartItem {
  id: number;
  name: string;
  farm: string;
  price: number;
  qty: number;
  unit: string;
}

const initialCartItems: CartItem[] = [
  { id: 1, name: 'Organic Tomatoes', farm: 'Green Valley Farm', price: 45, qty: 3, unit: 'kg' },
  { id: 2, name: 'Basmati Rice', farm: 'Golden Fields', price: 85, qty: 5, unit: 'kg' },
  { id: 3, name: 'Fresh Spinach', farm: 'Green Valley Farm', price: 30, qty: 2, unit: 'bunch' },
];

const ConsumerCart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);

  const updateQty = (id: number, delta: number) => {
    setCartItems(prev => prev.map(item =>
      item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  const removeItem = (id: number) => {
    const item = cartItems.find(i => i.id === id);
    setCartItems(prev => prev.filter(i => i.id !== id));
    if (item) toast.success(`${item.name} removed from cart`);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = cartItems.length > 0 ? 40 : 0;

  const handleCheckout = () => {
    toast.success('Order placed successfully! 🎉');
    setCartItems([]);
  };

  if (cartItems.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold font-display text-foreground">Your cart is empty</h2>
        <p className="text-muted-foreground mt-1">Browse fresh produce and add items to your cart</p>
        <Button className="mt-4" onClick={() => navigate('/consumer')}>Browse Products</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display text-foreground">Shopping Cart</h1>
      <p className="text-muted-foreground">{cartItems.length} items in your cart</p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <AnimatePresence>
            {cartItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <img src={freshProduce} alt={item.name} className="h-20 w-20 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground text-sm">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.farm}</p>
                  <p className="font-bold text-card-foreground mt-1">₹{item.price}/{item.unit}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                  <div className="flex items-center gap-2 border border-border rounded-lg">
                    <button onClick={() => updateQty(item.id, -1)} className="p-1.5 hover:bg-muted rounded-l-lg"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-1.5 hover:bg-muted rounded-r-lg"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card h-fit sticky top-4">
          <h2 className="text-lg font-bold font-display text-card-foreground mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-card-foreground">₹{subtotal}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-card-foreground">₹{delivery}</span></div>
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
              <span className="text-card-foreground">Total</span><span className="text-card-foreground">₹{subtotal + delivery}</span>
            </div>
          </div>
          <Button className="w-full mt-4 h-12 gap-2 font-semibold" onClick={handleCheckout}><CreditCard className="h-4 w-4" /> Proceed to Pay</Button>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground justify-center">
            <Truck className="h-3.5 w-3.5" /> Estimated delivery: Tomorrow by 10 AM
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsumerCart;
