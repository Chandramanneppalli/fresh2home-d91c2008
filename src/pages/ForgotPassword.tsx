import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sprout, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSent(true);
    toast({ title: 'Email sent', description: 'Check your inbox for a password reset link.' });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto">
        <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </button>

        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sprout className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold font-display">FarmLink</span>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Mail className="h-7 w-7 text-primary" />
        </div>

        {sent ? (
          <>
            <h1 className="text-3xl font-bold font-display mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-4">
              We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            </p>
            <p className="text-sm text-muted-foreground mb-8">Click the link in your email to set a new password. If you don't see it, check your spam folder.</p>
            <Button onClick={() => navigate('/login')} variant="outline" size="lg" className="w-full h-12">
              Back to Login
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold font-display mb-2">Forgot Password?</h1>
            <p className="text-muted-foreground mb-8">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-12" required />
              </div>
              <Button type="submit" size="lg" className="w-full h-12 font-semibold" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : 'Send Reset Link'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
