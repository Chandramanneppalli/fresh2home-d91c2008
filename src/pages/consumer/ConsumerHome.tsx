import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Filter, Leaf, ShoppingCart, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import freshProduce from '@/assets/fresh-produce.jpg';

const categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic'];

const gradeColors: Record<string, string> = {
  'A+': 'bg-farm-success/15 text-farm-success',
  'A': 'bg-primary/15 text-primary',
  'B+': 'bg-farm-warning/15 text-farm-warning',
};

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  grade: string;
  organic: boolean;
  farm_name: string | null;
  farm_distance: string | null;
  rating: number;
  review_count: number;
  farmer_id: string;
}

const ConsumerHome = () => {
  const navigate = useNavigate();
  const { userName, user } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();

    // Realtime subscription for product updates
    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory || (activeCategory === 'Organic' && p.organic);
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.farm_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!user) { toast.error('Please log in first'); return; }

    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { user_id: user.id, product_id: product.id, quantity: 1 },
        { onConflict: 'user_id,product_id' }
      );

    if (error) {
      // If upsert with quantity 1 conflicts, increment instead
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      }
    }
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Hello, {userName} 👋</h1>
        <p className="text-muted-foreground mt-1">Fresh from farm to your table</p>
      </motion.div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products, farms..." className="pl-10 h-12" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {categories.map((cat) => (
          <Button key={cat} variant={activeCategory === cat ? 'default' : 'outline'} size="sm" className="shrink-0 rounded-full" onClick={() => setActiveCategory(cat)}>
            {cat}
          </Button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-5 w-5" />
          <span className="font-medium">Nearby Farms</span>
        </div>
        <p className="text-2xl font-bold font-display">12 farms within 15 km</p>
        <p className="text-primary-foreground/70 text-sm mt-1">Fresh produce available for pickup or delivery</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/consumer/browse')}>Discover Farms →</Button>
      </motion.div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-display text-foreground">Fresh Produce</h2>
          <button onClick={() => navigate('/consumer/browse')} className="text-sm text-primary font-medium hover:underline">View All</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No products found.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden text-left group hover:shadow-elevated transition-shadow">
                <button onClick={() => navigate(`/consumer/product/${product.id}`)} className="w-full text-left">
                  <div className="relative h-36 overflow-hidden">
                    <img src={freshProduce} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {product.organic && (
                      <Badge className="absolute top-3 left-3 bg-farm-success/90 text-primary-foreground gap-1">
                        <Leaf className="h-3 w-3" /> Organic
                      </Badge>
                    )}
                    <Badge className={`absolute top-3 right-3 ${gradeColors[product.grade] || 'bg-muted text-muted-foreground'}`}>{product.grade}</Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-card-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.farm_name} • {product.farm_distance}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-card-foreground">₹{product.price}<span className="text-xs font-normal text-muted-foreground">/{product.unit}</span></span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-farm-gold text-farm-gold" />
                        <span className="text-sm font-medium text-card-foreground">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.review_count})</span>
                      </div>
                    </div>
                  </div>
                </button>
                <div className="px-4 pb-4">
                  <Button size="sm" className="w-full gap-1" onClick={(e) => handleAddToCart(e, product)}>
                    <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumerHome;
