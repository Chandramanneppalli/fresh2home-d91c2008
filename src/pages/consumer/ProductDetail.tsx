import { motion } from 'framer-motion';
import { ArrowLeft, Star, MapPin, Leaf, Shield, MessageCircle, ShoppingCart, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import freshProduce from '@/assets/fresh-produce.jpg';

const trackingSteps = [
  { label: 'Harvested', date: 'Feb 5, 2026', time: '6:30 AM', done: true },
  { label: 'Quality Checked', date: 'Feb 5, 2026', time: '8:00 AM', done: true },
  { label: 'Stored', date: 'Feb 5, 2026', time: '9:15 AM', done: true },
  { label: 'In Transit', date: 'Feb 6, 2026', time: '7:00 AM', done: true },
  { label: 'Delivered', date: '', time: '', done: false },
];

const ProductDetail = () => {
  const navigate = useNavigate();

  const handleAddToCart = () => {
    toast.success('Organic Tomatoes added to cart!');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Image */}
      <div className="relative h-64 md:h-80">
        <img src={freshProduce} alt="Product" className="w-full h-full object-cover" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 h-10 w-10 rounded-full bg-card/80 backdrop-blur flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-card-foreground" />
        </button>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex gap-2 mb-2">
            <Badge className="bg-farm-success/15 text-farm-success gap-1"><Leaf className="h-3 w-3" /> Organic</Badge>
            <Badge className="bg-farm-success/15 text-farm-success">Grade A+</Badge>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Organic Tomatoes</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Green Valley Farm, Punjab • 3.2 km</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`h-4 w-4 ${s <= 4 ? 'fill-farm-gold text-farm-gold' : 'fill-farm-gold/30 text-farm-gold/30'}`} />)}
            </div>
            <span className="text-sm font-medium text-foreground">4.8</span>
            <span className="text-sm text-muted-foreground">(124 reviews)</span>
          </div>
        </div>

        {/* Price + Cart */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-accent border border-primary/20">
          <div>
            <p className="text-3xl font-bold font-display text-foreground">₹45<span className="text-sm font-normal text-muted-foreground">/kg</span></p>
            <p className="text-xs text-primary flex items-center gap-1 mt-0.5"><Shield className="h-3 w-3" /> AI Fair Price Verified</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/consumer/chat')} className="gap-1"><MessageCircle className="h-4 w-4" /> Chat</Button>
            <Button className="gap-1" onClick={handleAddToCart}><ShoppingCart className="h-4 w-4" /> Add to Cart</Button>
          </div>
        </div>

        {/* Origin & Tracking */}
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

        {/* Farmer Info */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-lg font-bold font-display text-card-foreground mb-3">About the Farmer</h2>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">RK</div>
            <div>
              <p className="font-medium text-card-foreground">Rajesh Kumar</p>
              <p className="text-xs text-muted-foreground">Green Valley Farm, Punjab</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="h-3 w-3 fill-farm-gold text-farm-gold" />
                <span className="text-xs font-medium text-card-foreground">4.9</span>
                <span className="text-xs text-muted-foreground">• 3 years on FarmLink</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-lg font-bold font-display text-card-foreground mb-3">Reviews</h2>
          {[
            { name: 'Meera K.', rating: 5, text: 'Incredibly fresh! Best tomatoes I\'ve had in years.', time: '2 days ago' },
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
