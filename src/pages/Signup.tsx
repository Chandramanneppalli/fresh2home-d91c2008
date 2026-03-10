import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const selectedRole = (location.state?.role as 'farmer' | 'consumer') || 'consumer';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: name,
          phone: phone || null,
          role: selectedRole,
          farm_name: selectedRole === 'farmer' ? farmName : null,
          farm_location: null,
        },
      },
    });
    setIsLoading(false);

    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Account created!',
      description: 'Welcome to FarmLink!',
    });
    const dest = selectedRole === 'farmer' ? '/farmer' : selectedRole === 'admin' ? '/admin' : '/consumer';
    navigate(dest, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto">
        <button onClick={() => navigate('/role-select')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sprout className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold font-display">FarmLink</span>
        </div>

        <h1 className="text-3xl font-bold font-display mb-2">Create Account</h1>
        <p className="text-muted-foreground mb-1">
          Signing up as <span className="font-medium text-primary capitalize">{selectedRole}</span>
        </p>
        <p className="text-sm text-muted-foreground mb-8">Fill in your details to get started</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} className="mt-1.5 h-12" required />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-12" required />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1.5 h-12" />
          </div>
          <div>
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 h-12" required minLength={6} />
          </div>
          {selectedRole === 'farmer' && (
            <div>
              <Label htmlFor="farm">Farm Name / Location</Label>
              <Input id="farm" placeholder="e.g. Green Valley Farm, Punjab" value={farmName} onChange={e => setFarmName(e.target.value)} className="mt-1.5 h-12" />
            </div>
          )}
          <Button type="submit" size="lg" className="w-full h-12 font-semibold mt-2" disabled={isLoading}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">Sign in</button>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
