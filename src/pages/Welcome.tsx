import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sprout, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-farm.webp';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroImage} alt="Lush farmland at golden hour" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-between px-6 py-8 sm:py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 pt-4 sm:pt-8"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sprout className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground font-display">FarmLink</h1>
            <p className="text-xs tracking-widest text-primary-foreground/70 uppercase">Connect</p>
          </div>
        </motion.div>

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-center max-w-lg"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-display leading-tight text-primary-foreground mb-4">
            Farm to Table,{' '}
            <span className="text-farm-gold">Reimagined</span>
          </h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            AI-powered marketplace connecting farmers directly with consumers. 
            Fair prices, full transparency, zero middlemen.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="w-full max-w-sm space-y-3 pb-8"
        >
          <Button
            onClick={() => navigate('/role-select')}
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-elevated gap-2"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            size="lg"
            className="w-full h-14 text-lg font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            I already have an account
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
