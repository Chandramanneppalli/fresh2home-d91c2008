import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Leaf, ShoppingCart, RotateCcw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import freshProduce from '@/assets/fresh-produce.jpg';

interface QualityMetrics {
  freshness: number;
  color_uniformity: number;
  size_consistency: number;
  surface_quality: number;
  overall_grade: string;
  summary: string;
  average_score?: number;
  scanned_at?: string;
}

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
  quality_metrics?: QualityMetrics | null;
  quality_scan_image?: string | null;
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-farm-success/15 text-farm-success',
  'A': 'bg-primary/15 text-primary',
  'B+': 'bg-farm-warning/15 text-farm-warning',
};

const metricMeta: Record<string, { label: string; color: string }> = {
  freshness: { label: 'Freshness', color: 'bg-farm-success' },
  color_uniformity: { label: 'Color', color: 'bg-primary' },
  size_consistency: { label: 'Size', color: 'bg-farm-sky' },
  surface_quality: { label: 'Surface', color: 'bg-farm-gold' },
};

interface Props {
  product: Product;
  index: number;
  onNavigate: (id: string) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
  t: Record<string, string>;
}

const ProductFlipCard = ({ product, index, onNavigate, onAddToCart, t }: Props) => {
  const [flipped, setFlipped] = useState(false);
  const hasMetrics = !!product.quality_metrics;

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
      style={{ perspective: 1000 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {/* Front */}
        <div
          className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <button onClick={() => onNavigate(product.id)} className="w-full text-left">
            <div className="relative h-36 overflow-hidden">
              <img src={product.quality_scan_image || freshProduce} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              {product.organic && (
                <Badge className="absolute top-3 left-3 bg-farm-success/90 text-primary-foreground gap-1">
                  <Leaf className="h-3 w-3" /> {t.organic}
                </Badge>
              )}
              <Badge className={`absolute top-3 right-3 ${gradeColors[product.grade] || 'bg-muted text-muted-foreground'}`}>{product.grade}</Badge>
              {hasMetrics && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur border border-border hover:bg-background transition-colors"
                  title="View quality metrics"
                >
                  <ShieldCheck className="h-4 w-4 text-farm-success" />
                </button>
              )}
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
            <Button size="sm" className="w-full gap-1" onClick={(e) => onAddToCart(e, product)}>
              <ShoppingCart className="h-3.5 w-3.5" /> {t.addToCart}
            </Button>
          </div>
        </div>

        {/* Back – Quality Metrics */}
        {hasMetrics && (
          <div
            className="absolute inset-0 rounded-xl border border-border bg-card shadow-card overflow-hidden p-4 flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-farm-success" />
                <h3 className="font-semibold text-card-foreground text-sm">Quality Report</h3>
              </div>
              <button
                onClick={() => setFlipped(false)}
                className="p-1.5 rounded-full hover:bg-accent transition-colors"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${gradeColors[product.grade] || 'bg-muted text-muted-foreground'} text-xs`}>
                Grade {product.grade}
              </Badge>
              <span className="text-xs text-muted-foreground">AI Verified</span>
            </div>

            <div className="space-y-2.5 flex-1">
              {Object.entries(metricMeta).map(([key, meta]) => {
                const score = (product.quality_metrics as any)?.[key] as number | undefined;
                if (score === undefined) return null;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{meta.label}</span>
                      <span className="font-medium text-foreground">{score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${meta.color}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground italic mt-2 line-clamp-2">
              "{(product.quality_metrics as any)?.summary}"
            </p>

            {(product.quality_metrics as any)?.scanned_at && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Scanned: {new Date((product.quality_metrics as any).scanned_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ProductFlipCard;
