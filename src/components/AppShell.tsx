import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Home, Package, ShoppingCart, Cloud, MessageCircle, Camera, BarChart3, LogOut, Settings, Users, AlertTriangle, TrendingUp, UserCircle } from 'lucide-react';
import { useApp, UserRole } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavItem {
  icon: typeof Home;
  labelKey: string;
  path: string;
}

const farmerNav: NavItem[] = [
  { icon: Home, labelKey: 'dashboard', path: '/farmer' },
  { icon: Package, labelKey: 'products', path: '/farmer/products' },
  { icon: ShoppingCart, labelKey: 'orders', path: '/farmer/orders' },
  { icon: Cloud, labelKey: 'climate', path: '/farmer/climate' },
  { icon: TrendingUp, labelKey: 'pricing', path: '/farmer/pricing' },
  { icon: MessageCircle, labelKey: 'chat', path: '/farmer/chat' },
  { icon: Camera, labelKey: 'qualityScan', path: '/farmer/scan' },
];

const consumerNav: NavItem[] = [
  { icon: Home, labelKey: 'home', path: '/consumer' },
  { icon: Package, labelKey: 'browse', path: '/consumer/browse' },
  { icon: ShoppingCart, labelKey: 'cart', path: '/consumer/cart' },
  { icon: BarChart3, labelKey: 'orders', path: '/consumer/orders' },
  { icon: MessageCircle, labelKey: 'chat', path: '/consumer/chat' },
];

const adminNav: NavItem[] = [
  { icon: Home, labelKey: 'overview', path: '/admin' },
  { icon: Users, labelKey: 'users', path: '/admin/users' },
  { icon: TrendingUp, labelKey: 'revenue', path: '/admin/revenue' },
  { icon: AlertTriangle, labelKey: 'disputes', path: '/admin/disputes' },
  { icon: Settings, labelKey: 'settings', path: '/admin/settings' },
];

const getNavItems = (role: UserRole) => {
  if (role === 'farmer') return farmerNav;
  if (role === 'admin') return adminNav;
  return consumerNav;
};

const getPortalLabel = (role: UserRole, t: any) => {
  if (role === 'farmer') return t.farmerPortal;
  if (role === 'admin') return t.adminPortal;
  return t.consumerPortal;
};

const AppShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, userName, signOut } = useApp();
  const { t } = useLanguage();
  const navItems = getNavItems(role);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getLabel = (key: string) => (t as any)[key] || key;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Sprout className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground">FarmLink</p>
            <p className="text-xs text-sidebar-foreground/60">{getPortalLabel(role, t)}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                {getLabel(item.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={() => navigate(`/${role}/profile`)}
            className="flex w-full items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{role}</p>
            </div>
          </button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="h-4 w-4" /> {t.logout}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sprout className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold font-display text-sm">FarmLink</span>
          </div>
          <button onClick={() => navigate(`/${role}/profile`)} className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-center justify-around border-t border-border bg-card px-2 py-2 safe-area-pb">
          {navItems.slice(0, 5).map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{getLabel(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AppShell;
