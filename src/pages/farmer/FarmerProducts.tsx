import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import freshProduce from '@/assets/fresh-produce.jpg';

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  grade: string;
  category: string;
  organic: boolean;
  in_stock: boolean;
  description: string | null;
  farm_name: string | null;
  farm_distance: string | null;
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-farm-success/15 text-farm-success',
  'A': 'bg-primary/15 text-primary',
  'B+': 'bg-farm-warning/15 text-farm-warning',
};

const emptyForm = { name: '', price: '', unit: 'kg', grade: 'A', category: 'Vegetables', organic: false, description: '' };

const FarmerProducts = () => {
  const { user } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProducts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('farmer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();

    // Realtime subscription
    const channel = supabase
      .channel('farmer-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: String(product.price),
      unit: product.unit,
      grade: product.grade,
      category: product.category,
      organic: product.organic,
      description: product.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setSaving(true);

    // Fetch farmer profile for farm_name
    const { data: profile } = await supabase
      .from('profiles')
      .select('farm_name, farm_location')
      .eq('user_id', user.id)
      .single();

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update({
          name: form.name,
          price: Number(form.price),
          unit: form.unit,
          grade: form.grade,
          category: form.category,
          organic: form.organic,
          description: form.description || null,
        })
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Failed to update product');
        console.error(error);
      } else {
        toast.success(`${form.name} updated successfully`);
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert({
          farmer_id: user.id,
          name: form.name,
          price: Number(form.price),
          unit: form.unit,
          grade: form.grade,
          category: form.category,
          organic: form.organic,
          description: form.description || null,
          farm_name: profile?.farm_name || null,
          farm_distance: profile?.farm_location || null,
        });

      if (error) {
        toast.error('Failed to add product');
        console.error(error);
      } else {
        toast.success(`${form.name} added successfully`);
      }
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Failed to delete product');
      console.error(error);
    } else {
      toast.success(`${deleteTarget.name} removed`);
    }
    setDeleteTarget(null);
  };

  const toggleStock = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ in_stock: !product.in_stock })
      .eq('id', product.id);

    if (error) {
      toast.error('Failed to update stock status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">My Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} products listed</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No products yet</p>
          <p className="text-sm mt-1">Add your first product to start selling to consumers.</p>
          <Button className="mt-4 gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden group"
            >
              <div className="relative h-36 overflow-hidden">
                <img src={freshProduce} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <Badge className={`absolute top-3 right-3 ${gradeColors[product.grade] || 'bg-muted text-muted-foreground'}`}>
                  Grade {product.grade}
                </Badge>
                {!product.in_stock && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Badge variant="destructive">Out of Stock</Badge>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-card-foreground">{product.name}</h3>
                  {product.organic && <Badge className="bg-farm-success/15 text-farm-success text-xs">Organic</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-card-foreground">₹{product.price}/{product.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{product.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">In Stock</span>
                    <Switch checked={product.in_stock} onCheckedChange={() => toggleStock(product)} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(product)}>
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(product)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the product details below.' : 'Fill in the details to list a new product. It will be visible to consumers immediately.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" placeholder="e.g. Organic Tomatoes" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input id="price" type="number" placeholder="45" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vegetables">Vegetables</SelectItem>
                    <SelectItem value="Fruits">Fruits</SelectItem>
                    <SelectItem value="Grains">Grains</SelectItem>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
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
              <div className="space-y-2">
                <Label>Grade</Label>
                <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.organic} onCheckedChange={(v) => setForm({ ...form, organic: v })} />
              <Label>Organic Product</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProduct ? 'Save Changes' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product from your listings and consumers will no longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FarmerProducts;
