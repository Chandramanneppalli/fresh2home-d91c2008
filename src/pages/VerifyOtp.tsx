import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, role } = useApp();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);

  // Auto-navigate when user gets verified (e.g. by clicking email link)
  useEffect(() => {
    if (isAuthenticated && role) {
      setVerified(true);
      const dest = role === 'farmer' ? '/farmer' : role === 'admin' ? '/admin' : '/consumer';
      const timeout = setTimeout(() => navigate(dest, { replace: true }), 1500);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, role, navigate]);

  const handleVerify = async () => {
    if (otp.length !== 8) {
      toast({ title: 'Enter OTP', description: 'Please enter the 8-digit code sent to your email.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });
    setIsLoading(false);

    if (error) {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Email verified!', description: 'Your account is now active.' });
  };

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setIsResending(false);

    if (error) {
      toast({ title: 'Resend failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email resent', description: 'Check your inbox (and spam folder) for the verification email.' });
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No email found. Please sign up first.</p>
          <Button onClick={() => navigate('/role-select')}>Go to Sign Up</Button>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-display mb-2">Email Verified!</h2>
          <p className="text-muted-foreground">Redirecting you to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-sm mx-auto">
        <button onClick={() => navigate('/signup')} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
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

        <h1 className="text-3xl font-bold font-display mb-2">Verify Your Email</h1>
        <p className="text-muted-foreground mb-1">
          We sent a verification email to
        </p>
        <p className="font-medium text-foreground mb-6">{email}</p>

        <div className="rounded-lg border border-border bg-muted/50 p-4 mb-6">
          <p className="text-sm font-medium text-foreground mb-1">📧 Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            Click the <strong>verification link</strong> in the email, or enter the 8-digit code below.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Don't see it? Check your <strong>spam/junk</strong> folder.
          </p>
        </div>

        <p className="text-sm font-medium text-foreground mb-3">Or enter the verification code:</p>

        <div className="flex justify-center mb-6">
          <InputOTP maxLength={8} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
              <InputOTPSlot index={6} />
              <InputOTPSlot index={7} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button onClick={handleVerify} size="lg" className="w-full h-12 font-semibold" disabled={isLoading || otp.length !== 8}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...</> : 'Verify with Code'}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Didn't receive the email?{' '}
          <button onClick={handleResend} disabled={isResending} className="text-primary font-medium hover:underline disabled:opacity-50">
            {isResending ? 'Sending...' : 'Resend email'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default VerifyOtp;
