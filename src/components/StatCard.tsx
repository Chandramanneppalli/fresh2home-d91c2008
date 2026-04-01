import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  variant?: 'default' | 'primary' | 'gold' | 'sky';
  onClick?: () => void;
}

const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-accent border-primary/20',
  gold: 'bg-farm-gold/10 border-farm-gold/20',
  sky: 'bg-farm-sky/10 border-farm-sky/20',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  gold: 'bg-farm-gold/20 text-farm-gold',
  sky: 'bg-farm-sky/20 text-farm-sky',
};

export const StatCard = ({ icon: Icon, label, value, change, positive, variant = 'default', onClick }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={`rounded-xl border p-4 shadow-card ${variantStyles[variant]} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all' : ''}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconStyles[variant]}`}>
        <Icon className="h-5 w-5" />
      </div>
      {change && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${positive ? 'bg-farm-success/15 text-farm-success' : 'bg-destructive/15 text-destructive'}`}>
          {change}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold font-display text-card-foreground">{value}</p>
    <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
  </motion.div>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const SectionHeader = ({ title, subtitle, action }: SectionHeaderProps) => (
  <div className="flex items-end justify-between mb-4">
    <div>
      <h2 className="text-xl font-bold font-display text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);
