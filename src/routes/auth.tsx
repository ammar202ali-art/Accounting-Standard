import { useState, type FormEvent } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { pageHead } from '@/lib/portal-data';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [...pageHead('دخول الإدارة', 'تسجيل الدخول إلى لوحة تحكم محاسبون.').meta, { name: 'robots', content: 'noindex' }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMessage({ tone: 'error', text: 'البريد أو كلمة المرور غير صحيحة، أو لم يُؤكَّد البريد بعد.' });
      navigate({ to: '/admin' });
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setBusy(false);
      if (error) return setMessage({ tone: 'error', text: error.message.includes('Password') ? 'كلمة المرور ضعيفة؛ استخدم 8 أحرف على الأقل.' : 'تعذّر إنشاء الحساب. ربما البريد مسجّل مسبقًا.' });
      setMessage({ tone: 'ok', text: 'أرسلنا رابط تأكيد إلى بريدك. افتحه ثم سجّل الدخول.' });
      setMode('in');
    }
  }

  return (
    <section className="section page-container">
      <div className="admin-auth-card">
        <LockKeyhole className="mx-auto text-primary" size={30}/>
        <h1 className="mt-3 text-center text-2xl font-semibold">{mode === 'in' ? 'دخول لوحة التحكم' : 'إنشاء حساب مشرف'}</h1>
        <p className="mt-2 text-center text-xs text-muted-foreground">أول حساب يُنشأ يصبح مدير الموقع تلقائيًا، وبقية الحسابات تحتاج موافقة المدير.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" type="email" dir="ltr" required value={email} onChange={e => setEmail(e.target.value)}/></div>
          <div className="space-y-2"><Label htmlFor="password">كلمة المرور</Label><Input id="password" type="password" dir="ltr" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}/></div>
          {message && <p role="status" className={`text-sm ${message.tone === 'error' ? 'text-destructive' : 'text-primary'}`}>{message.text}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'جارٍ المعالجة…' : mode === 'in' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</Button>
        </form>
        <Button variant="link" className="mt-3 w-full" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMessage(null); }}>
          {mode === 'in' ? 'ليس لديك حساب؟ أنشئ حسابًا' : 'لديك حساب؟ سجّل الدخول'}
        </Button>
      </div>
    </section>
  );
}
