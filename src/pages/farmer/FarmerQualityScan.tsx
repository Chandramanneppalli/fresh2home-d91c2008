import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, CheckCircle, XCircle, Loader2, Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface QualityMetrics {
  freshness: number;
  color_uniformity: number;
  size_consistency: number;
  surface_quality: number;
  overall_grade: string;
  summary: string;
  recommendations?: string[];
}

const metricLabels: Record<string, { label: string; color: string }> = {
  freshness: { label: 'Freshness', color: 'bg-farm-success' },
  color_uniformity: { label: 'Color Uniformity', color: 'bg-primary' },
  size_consistency: { label: 'Size Consistency', color: 'bg-farm-sky' },
  surface_quality: { label: 'Surface Quality', color: 'bg-farm-gold' },
};

const gradeConfig: Record<string, { color: string; icon: typeof CheckCircle; text: string }> = {
  'A+': { color: 'bg-farm-success/10 border-farm-success/20 text-farm-success', icon: CheckCircle, text: 'Premium quality – Market ready!' },
  'A': { color: 'bg-primary/10 border-primary/20 text-primary', icon: CheckCircle, text: 'Good quality – Acceptable for listing' },
  'B+': { color: 'bg-farm-warning/10 border-farm-warning/20 text-farm-warning', icon: AlertTriangle, text: 'Below standard – Needs improvement' },
  'Reject': { color: 'bg-destructive/10 border-destructive/20 text-destructive', icon: XCircle, text: 'Rejected – Does not meet quality standards' },
};

const PASSING_GRADES = ['A+', 'A'];

const FarmerQualityScan = () => {
  const { user } = useApp();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [adding, setAdding] = useState(false);

  // Product form for one-click add
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('Vegetables');
  const [organic, setOrganic] = useState(false);

  const handleImageSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageBase64(result.split(',')[1]);
      setMetrics(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!imageBase64) { toast.error('Please upload an image first'); return; }

    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('quality-scan', {
        body: { imageBase64, productName, category },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMetrics(data.metrics);

      if (PASSING_GRADES.includes(data.metrics.overall_grade)) {
        toast.success(`Grade ${data.metrics.overall_grade} – Quality approved!`);
      } else {
        toast.error(`Grade ${data.metrics.overall_grade} – Quality insufficient for listing`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleAddProduct = async () => {
    if (!metrics || !PASSING_GRADES.includes(metrics.overall_grade)) return;
    if (!productName || !price) { toast.error('Please fill product name and price'); return; }
    if (!user) { toast.error('You must be logged in'); return; }

    setAdding(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('farm_name, farm_location')
        .eq('user_id', user.id)
        .single();

      // Upload image to storage bucket instead of storing base64
      let imageUrl: string | null = null;
      if (imageBase64) {
        const byteString = atob(imageBase64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: 'image/jpeg' });

        const filePath = `${user.id}/${Date.now()}-${productName.replace(/\s+/g, '-').toLowerCase()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const avg = Math.round(
        (metrics.freshness + metrics.color_uniformity + metrics.size_consistency + metrics.surface_quality) / 4
      );

      const { error } = await supabase.from('products').insert({
        farmer_id: user.id,
        name: productName,
        price: Number(price),
        unit,
        grade: metrics.overall_grade,
        category,
        organic,
        farm_name: profile?.farm_name || null,
        farm_distance: profile?.farm_location || null,
        quality_metrics: {
          freshness: metrics.freshness,
          color_uniformity: metrics.color_uniformity,
          size_consistency: metrics.size_consistency,
          surface_quality: metrics.surface_quality,
          overall_grade: metrics.overall_grade,
          summary: metrics.summary,
          average_score: avg,
          scanned_at: new Date().toISOString(),
        },
        quality_scan_image: imageUrl,
      });

      if (error) throw error;
      toast.success(`${productName} added to your products!`);
      handleReset();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to add product');
    } finally {
      setAdding(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setMetrics(null);
    setProductName('');
    setPrice('');
    setUnit('kg');
    setCategory('Vegetables');
    setOrganic(false);
  };

  const isPassing = metrics && PASSING_GRADES.includes(metrics.overall_grade);
  const gradeInfo = metrics ? gradeConfig[metrics.overall_grade] || gradeConfig['Reject'] : null;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display text-foreground">AI Quality Scan</h1>
      <p className="text-muted-foreground">Upload a crop image for AI-powered quality grading. Products that pass can be listed instantly.</p>

      {/* Product Info Form */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-semibold text-card-foreground">Product Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="scan-name">{t.productName} *</Label>
            <Input id="scan-name" placeholder="e.g. Organic Tomatoes" value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scan-price">{t.price} (₹) *</Label>
            <Input id="scan-price" type="number" placeholder="45" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>{t.category}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Vegetables">{t.vegetables}</SelectItem>
                <SelectItem value="Fruits">{t.fruits}</SelectItem>
                <SelectItem value="Grains">{t.grains}</SelectItem>
                <SelectItem value="Dairy">{t.dairy}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.unit}</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="bunch">bunch</SelectItem>
                <SelectItem value="dozen">dozen</SelectItem>
                <SelectItem value="piece">piece</SelectItem>
                <SelectItem value="litre">litre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <Switch checked={organic} onCheckedChange={setOrganic} />
            <Label>{t.organic}</Label>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!imagePreview ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed border-primary/30 bg-accent/50 p-8 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Capture or Upload Crop Image</p>
              <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG up to 10MB</p>
            </div>
            <div className="flex gap-3">
              <Button className="gap-2" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4" /> Open Camera
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload Image
              </Button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-border relative">
            <img src={imagePreview} alt="Uploaded produce" className="w-full max-h-64 object-cover" />
            <Button variant="outline" size="sm" className="absolute top-3 right-3 gap-1 bg-background/80 backdrop-blur" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" /> Change
            </Button>
          </div>

          {!metrics && (
            <Button className="w-full gap-2" size="lg" onClick={handleScan} disabled={scanning}>
              {scanning ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing with AI...</> : <><Camera className="h-4 w-4" /> Run Quality Scan</>}
            </Button>
          )}
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {metrics && gradeInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-border bg-card shadow-card overflow-hidden space-y-4 p-5"
          >
            <h2 className="font-bold text-lg text-card-foreground">Scan Results</h2>

            {/* Grade Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${gradeInfo.color}`}>
              <gradeInfo.icon className="h-7 w-7 shrink-0" />
              <div>
                <p className="font-bold text-lg">Grade: {metrics.overall_grade}</p>
                <p className="text-sm opacity-80">{gradeInfo.text}</p>
              </div>
            </div>

            {/* Metric Bars */}
            <div className="space-y-3">
              {Object.entries(metricLabels).map(([key, meta], i) => {
                const score = metrics[key as keyof QualityMetrics] as number;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{meta.label}</span>
                      <span className="font-medium text-foreground">{score}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full ${meta.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <p className="text-sm text-muted-foreground italic">"{metrics.summary}"</p>

            {/* Recommendations */}
            {metrics.recommendations && metrics.recommendations.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Recommendations:</p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                  {metrics.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {isPassing ? (
                <Button className="flex-1 gap-2" size="lg" onClick={handleAddProduct} disabled={adding || !productName || !price}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add to My Products
                </Button>
              ) : (
                <Badge variant="destructive" className="text-sm py-2 px-4">
                  <XCircle className="h-4 w-4 mr-1" /> Cannot list – quality below threshold
                </Badge>
              )}
              <Button variant="outline" className="gap-1" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" /> Scan Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FarmerQualityScan;
