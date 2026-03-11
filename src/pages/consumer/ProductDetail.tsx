import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, MapPin, Leaf, Shield, MessageCircle, ShoppingCart, QrCode, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import freshProduce from '@/assets/fresh-produce.jpg';

const trackingSteps = [
  { label: 'Harvested', date: 'Feb 5, 2026', time: '6:30 AM', done: true },
  { label: 'Quality Checked', date: 'Feb 5, 2026', time: '8:00 AM', done: true },
  { label: 'Stored', date: 'Feb 5, 2026', time: '9:15 AM', done: true },
  { label: 'In Transit', date: 'Feb 6, 2026', time: '7:00 AM', done: true },
  { label: 'Delivered', date: '', time: '', done: false },
];

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  grade: string;
  organic: boolean;
  description: string | null;
  farm_name: string | null;
  farm_distance: string | null;
  rating: number;
  review_count: number;
  farmer_id: string;
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [farmerName, setFarmerName] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Product not found');
        navigate('/consumer');
        return;
      }
      setProduct(data);

      // Fetch farmer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', data.farmer_id)
        .single();

      if (profile) setFarmerName(profile.full_name);
      setLoading(false);
    };

    fetchProduct();
  }, [id, navigate]);

  const handleAddToCart = async () => {
    if (!user || !product) return;

    const { error } = await supabase
      .from('cart_items')
      .upsert(
        { user_id: user.id, product_id: product.id, quantity: 1 },
        { onConflict: 'user_id,product_id' }
      );

    if (error) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  const ratingFull = Math.floor(product.rating);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative h-64 md:h-80">
        <img src={freshProduce} alt={product.name} className="w-full h-full object-cover" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 h-10 w-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-card-foreground" />
        </button>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        <div>
          <div className="flex gap-2 mb-2">
            {product.organic && <Badge className="bg-farm-success/15 text-farm-success gap-1"><Leaf className="h-3 w-3" /> Organic</Badge>}
            <Badge className="bg-farm-success/15 text-farm-success">Grade {product.grade}</Badge>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">{product.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {product.farm_name} • {product.farm_distance}</p>
          {product.description && <p className="text-sm text-muted-foreground mt-2">{product.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= ratingFull ? 'fill-farm-gold text-farm-gold' : 'fill-farm-gold/30 text-farm-gold/30'}`} />)}
            </div>
            <span className="text-sm font-medium text-foreground">{product.rating}</span>
            <span className="text-sm text-muted-foreground">({product.review_count} reviews)</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-accent border border-primary/20">
          <div>
            <p className="text-3xl font-bold font-display text-foreground">₹{product.price}<span className="text-sm font-normal text-muted-foreground">/{product.unit}</span></p>
            <p className="text-xs text-primary flex items-center gap-1 mt-0.5"><Shield className="h-3 w-3" /> AI Fair Price Verified</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/consumer/chat')} className="gap-1"><MessageCircle className="h-4 w-4" /> Chat</Button>
            <Button className="gap-1" onClick={handleAddToCart}><ShoppingCart className="h-4 w-4" /> Add to Cart</Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-display text-card-foreground">Product Journey</h2>
            <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => navigate('/trace/LOT-TOM-2024-087')}><QrCode className="h-3 w-3" /> LOT-TOM-2024-087</Badge>
          </div>
          <div className="space-y-0">
            {trackingSteps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-4 w-4 rounded-full border-2 ${step.done ? 'bg-primary border-primary' : 'bg-card border-muted-foreground/30'}`} />
                  {i < trackingSteps.length - 1 && <div className={`w-0.5 h-10 ${step.done ? 'bg-primary/30' : 'bg-border'}`} />}
                </div>
                <div className="pb-6">
                  <p className={`font-medium text-sm ${step.done ? 'text-card-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                  {step.date && <p className="text-xs text-muted-foreground">{step.date} • {step.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-lg font-bold font-display text-card-foreground mb-3">About the Farmer</h2>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {farmerName ? farmerName.charAt(0).toUpperCase() : 'F'}
            </div>
            <div>
              <p className="font-medium text-card-foreground">{farmerName || 'Farmer'}</p>
              <p className="text-xs text-muted-foreground">{product.farm_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 fill-farm-gold text-farm-gold" />
                <span className="text-xs font-medium text-card-foreground">4.9</span>
                <span className="text-xs text-muted-foreground">• on FarmLink</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-lg font-bold font-display text-card-foreground mb-3">Reviews</h2>
          {[
            { name: 'Meera K.', rating: 5, text: 'Incredibly fresh! Best produce I\'ve had in years.', time: '2 days ago' },
            { name: 'Suresh P.', rating: 4, text: 'Good quality, delivered on time. Will order again.', time: '1 week ago' },
          ].map((review, i) => (
            <div key={i} className={`py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-card-foreground">{review.name}</p>
                <span className="text-xs text-muted-foreground">{review.time}</span>
              </div>
              <div className="flex gap-0.5 my-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-farm-gold text-farm-gold' : 'text-muted'}`} />)}
              </div>
              <p className="text-sm text-muted-foreground">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
