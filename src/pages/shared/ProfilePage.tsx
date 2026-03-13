import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage, LANGUAGES, LanguageCode } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Globe, Sun, Moon, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const ProfilePage = () => {
  const { user, userName, setUserName } = useApp();
  const { t, language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
            setEditName(data.full_name || '');
            setEditPhone(data.phone || '');
          }
        });
    }
  }, [user]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName, phone: editPhone })
      .eq('user_id', user.id);

    if (!error) {
      setUserName(editName);
      setProfile((p: any) => ({ ...p, full_name: editName, phone: editPhone }));
      setEditing(false);
      toast({ title: t.save, description: '✓' });
    }
    setSaving(false);
  };

  const profileFields = [
    { icon: User, label: t.fullName, value: profile?.full_name || userName },
    { icon: Mail, label: t.email, value: user?.email || '' },
    { icon: Phone, label: t.phone, value: profile?.phone || '—' },
    { icon: Globe, label: t.selectLanguage, value: LANGUAGES.find(l => l.code === language)?.nativeLabel || 'English' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold font-display">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || userName}</h1>
          <p className="text-sm text-muted-foreground capitalize">{user?.user_metadata?.role || 'user'}</p>
        </div>
      </div>

      {/* User ID */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">User ID</p>
              <p className="text-sm text-foreground font-mono break-all">{profile?.display_id || '—'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={copyUserId} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{t.fullName}</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {t.edit}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label>{t.fullName}</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.phone}</Label>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                  {saving ? t.loading : t.save}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>{t.cancel}</Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {profileFields.map((field, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <field.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="text-sm text-foreground truncate">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t.selectLanguage}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeLabel} ({lang.label})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-secondary" />}
              <div>
                <p className="text-sm font-medium text-foreground">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="text-xs text-muted-foreground">Toggle appearance</p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
