import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, LogOut, Pencil, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { pageHead } from '@/lib/portal-data';
import { wpPostsQuery } from '@/lib/site-queries';

type JobDbRow = Database['public']['Tables']['jobs']['Row'];
type Role = 'admin' | 'editor';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({ meta: [...pageHead('لوحة التحكم', 'إدارة الوظائف والمقالات ونصوص موقع محاسبون.').meta, { name: 'robots', content: 'noindex' }] }),
  component: AdminPage,
});

function useMyRoles() {
  const { user } = Route.useRouteContext();
  return useQuery({
    queryKey: ['my-roles', user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if (error) throw error;
      return data.map(r => r.role as Role);
    },
  });
}

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roles = useMyRoles();
  const isAdmin = roles.data?.includes('admin') ?? false;
  const isStaff = isAdmin || (roles.data?.includes('editor') ?? false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: ['my-roles'] });
    queryClient.removeQueries({ queryKey: ['admin'] });
    await supabase.auth.signOut();
    navigate({ to: '/auth', replace: true });
  }

  return (
    <section className="section page-container">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">لوحة التحكم</div>
          <h1 className="text-2xl font-semibold">إدارة محاسبون</h1>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{user.email}</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut/>تسجيل الخروج</Button>
      </div>

      {roles.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحقق من الصلاحيات…</p> : !isStaff ? (
        <div className="admin-panel text-center">
          <ShieldAlert className="mx-auto mb-3 text-muted-foreground" size={34}/>
          <h2 className="text-lg font-semibold">حسابك بانتظار الصلاحية</h2>
          <p className="mt-2 text-sm text-muted-foreground">اطلب من مدير الموقع إضافتك من قسم «المشرفون» في لوحة التحكم.</p>
        </div>
      ) : (
        <Tabs defaultValue="jobs" dir="rtl">
          <TabsList className="mb-5 flex-wrap">
            <TabsTrigger value="jobs">الوظائف</TabsTrigger>
            <TabsTrigger value="articles">المقالات</TabsTrigger>
            <TabsTrigger value="content">نصوص الصفحات</TabsTrigger>
            {isAdmin && <TabsTrigger value="team">المشرفون</TabsTrigger>}
          </TabsList>
          <TabsContent value="jobs"><JobsAdmin/></TabsContent>
          <TabsContent value="articles"><ArticlesAdmin/></TabsContent>
          <TabsContent value="content"><ContentAdmin/></TabsContent>
          {isAdmin && <TabsContent value="team"><TeamAdmin selfId={user.id}/></TabsContent>}
        </Tabs>
      )}
    </section>
  );
}

/* ---------------- Jobs ---------------- */

const emptyJob = { title: '', company: '', location: '', role: '', employment_type: 'دوام كامل', experience: '', tags: [] as string[], details: '', description: [] as string[], responsibilities: [] as string[], qualifications: [] as string[], apply_docs: [] as string[], apply_email: '', published: true };
type JobDraft = typeof emptyJob & { id?: number };

const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);

function JobsAdmin() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<JobDraft | null>(null);
  const jobs = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*').order('id', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] }), queryClient.invalidateQueries({ queryKey: ['jobs'] })]);

  async function togglePublished(job: JobDbRow) {
    const { error } = await supabase.from('jobs').update({ published: !job.published }).eq('id', job.id);
    if (error) { toast.error('تعذّر تحديث الوظيفة'); return; }
    toast.success(job.published ? 'أُخفيت الوظيفة من الموقع' : 'نُشرت الوظيفة');
    refresh();
  }
  async function remove(job: JobDbRow) {
    if (!window.confirm(`حذف وظيفة «${job.title}» نهائيًا؟`)) return;
    const { error } = await supabase.from('jobs').delete().eq('id', job.id);
    if (error) { toast.error('تعذّر حذف الوظيفة'); return; }
    toast.success('حُذفت الوظيفة');
    refresh();
  }

  return (
    <div className="admin-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">الوظائف ({jobs.data?.length ?? 0})</h2>
        <Button onClick={() => setEditing({ ...emptyJob })}><Plus/>إضافة وظيفة</Button>
      </div>
      {jobs.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
      <div className="divide-y">
        {jobs.data?.map(job => (
          <div key={job.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{job.title} <span className="text-xs text-muted-foreground">#{job.id}</span></p>
              <p className="text-xs text-muted-foreground">{job.company} · {job.location} · {job.employment_type}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={job.published} onCheckedChange={() => togglePublished(job)} aria-label="منشورة"/>{job.published ? 'منشورة' : 'مخفية'}</label>
            <Button size="sm" variant="outline" onClick={() => setEditing({ ...job })}><Pencil/>تعديل</Button>
            <Button size="icon" variant="ghost" aria-label={`حذف ${job.title}`} onClick={() => remove(job)}><Trash2 className="text-destructive"/></Button>
          </div>
        ))}
      </div>
      <Dialog open={editing !== null} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>{editing?.id ? 'تعديل الوظيفة' : 'وظيفة جديدة'}</DialogTitle></DialogHeader>
          {editing && <JobForm initial={editing} onDone={() => { setEditing(null); refresh(); }}/>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobForm({ initial, onDone }: { initial: JobDraft; onDone: () => void }) {
  const [f, setF] = useState({
    ...initial,
    tagsText: initial.tags.join('، '),
    descriptionText: initial.description.join('\n'),
    responsibilitiesText: initial.responsibilities.join('\n'),
    qualificationsText: initial.qualifications.join('\n'),
    docsText: initial.apply_docs.join('\n'),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const row = {
      title: f.title.trim(), company: f.company.trim(), location: f.location.trim(), role: f.role.trim(),
      employment_type: f.employment_type.trim(), experience: f.experience.trim(), details: f.details.trim(), apply_email: f.apply_email.trim(),
      published: f.published,
      tags: f.tagsText.split(/[،,]/).map(t => t.trim()).filter(Boolean),
      description: lines(f.descriptionText), responsibilities: lines(f.responsibilitiesText),
      qualifications: lines(f.qualificationsText), apply_docs: lines(f.docsText),
    };
    const { error } = initial.id ? await supabase.from('jobs').update(row).eq('id', initial.id) : await supabase.from('jobs').insert(row);
    setBusy(false);
    if (error) { toast.error('تعذّر حفظ الوظيفة'); return; }
    toast.success('حُفظت الوظيفة');
    onDone();
  }

  const field = (k: keyof typeof f, label: string, opts: { ltr?: boolean; type?: string } = {}) => (
    <div className="space-y-1.5"><Label htmlFor={`job-${k}`}>{label}</Label><Input id={`job-${k}`} required type={opts.type} dir={opts.ltr ? 'ltr' : undefined} value={String(f[k])} onChange={set(k)}/></div>
  );
  const area = (k: keyof typeof f, label: string, hint: string, rows = 4) => (
    <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`job-${k}`}>{label}</Label><Textarea id={`job-${k}`} rows={rows} value={String(f[k])} onChange={set(k)}/><p className="text-[11px] text-muted-foreground">{hint}</p></div>
  );

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {field('title', 'المسمى الوظيفي')}
      {field('company', 'جهة العمل')}
      {field('location', 'المدينة')}
      {field('role', 'التصنيف (مثل: محاسب، محلل مالي)')}
      {field('employment_type', 'نوع الوظيفة (دوام كامل، عن بُعد…)')}
      {field('experience', 'الخبرة المطلوبة')}
      {field('apply_email', 'بريد التقديم', { ltr: true, type: 'email' })}
      <div className="space-y-1.5"><Label htmlFor="job-tags">الوسوم</Label><Input id="job-tags" value={f.tagsText} onChange={set('tagsText')}/><p className="text-[11px] text-muted-foreground">افصل بينها بفاصلة.</p></div>
      {area('details', 'ملخص قصير', 'يظهر في بطاقة الوظيفة.', 2)}
      {area('descriptionText', 'الوصف الكامل', 'كل فقرة في سطر.')}
      {area('responsibilitiesText', 'المسؤوليات', 'كل بند في سطر.')}
      {area('qualificationsText', 'المؤهلات المطلوبة', 'كل بند في سطر.')}
      {area('docsText', 'المستندات المطلوبة', 'كل مستند في سطر.', 3)}
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={f.published} onCheckedChange={v => setF({ ...f, published: v })}/>منشورة على الموقع</label>
      <div className="sm:col-span-2"><Button type="submit" disabled={busy} className="w-full">{busy ? 'جارٍ الحفظ…' : 'حفظ الوظيفة'}</Button></div>
    </form>
  );
}

/* ---------------- Articles (WordPress) ---------------- */

function ArticlesAdmin() {
  const queryClient = useQueryClient();
  const { data: posts, isFetching } = useSuspenseQuery(wpPostsQuery);
  return (
    <div className="admin-panel">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">مقالات ووردبريس ({posts.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" disabled={isFetching} onClick={() => queryClient.invalidateQueries({ queryKey: ['wp-posts'] })}><RefreshCw className={isFetching ? 'animate-spin' : ''}/>تحديث</Button>
          <Button asChild><a href="https://wordpress.com/post/mohasiboon.wordpress.com" target="_blank" rel="noreferrer"><Plus/>مقال جديد في ووردبريس</a></Button>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">تُكتب المقالات وتُعدّل في ووردبريس، وتظهر هنا وفي الموقع تلقائيًا بعد نشرها خلال دقيقة تقريبًا.</p>
      <div className="divide-y">
        {posts.map(p => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1"><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.category} · {new Date(p.date).toLocaleDateString('ar-SA')}</p></div>
            <Button asChild size="sm" variant="ghost"><Link to="/articles/$slug" params={{ slug: `wp-${p.slug}` }}>عرض</Link></Button>
            <Button asChild size="sm" variant="outline"><a href={p.editUrl} target="_blank" rel="noreferrer"><ExternalLink/>تعديل في ووردبريس</a></Button>
          </div>
        ))}
        {posts.length === 0 && <p className="py-6 text-sm text-muted-foreground">لا توجد مقالات منشورة بعد في ووردبريس.</p>}
      </div>
    </div>
  );
}

/* ---------------- Page text ---------------- */

const contentFields: { key: string; label: string; rows: number; hint?: string }[] = [
  { key: 'home_tagline', label: 'الرئيسية — العبارة تحت الشعار', rows: 1 },
  { key: 'home_intro', label: 'الرئيسية — النص التعريفي', rows: 3 },
  { key: 'home_cta_title', label: 'الرئيسية — عنوان الشريط السفلي', rows: 1 },
  { key: 'home_cta_text', label: 'الرئيسية — نص الشريط السفلي', rows: 2 },
  { key: 'about_title', label: 'عن محاسبون — العنوان', rows: 1 },
  { key: 'about_subtitle', label: 'عن محاسبون — العنوان الفرعي', rows: 2 },
  { key: 'about_body', label: 'عن محاسبون — المحتوى', rows: 12, hint: 'اترك سطرًا فارغًا بين الفقرات. ابدأ السطر بـ ## ليصبح عنوانًا.' },
  { key: 'footer_text', label: 'تذييل الموقع — النص التعريفي', rows: 2 },
];

function ContentAdmin() {
  const queryClient = useQueryClient();
  const content = useQuery({
    queryKey: ['admin', 'content'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_content').select('key, value');
      if (error) throw error;
      return Object.fromEntries(data.map(r => [r.key, r.value])) as Record<string, string>;
    },
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (content.data) setValues(content.data); }, [content.data]);

  async function save() {
    setBusy(true);
    const rows = contentFields.map(f => ({ key: f.key, value: values[f.key] ?? '' }));
    const { error } = await supabase.from('site_content').upsert(rows);
    setBusy(false);
    if (error) { toast.error('تعذّر حفظ النصوص'); return; }
    toast.success('حُفظت النصوص وظهرت في الموقع');
    queryClient.invalidateQueries({ queryKey: ['site-content'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
  }

  return (
    <div className="admin-panel space-y-5">
      <h2 className="text-lg font-semibold">نصوص الصفحات</h2>
      {contentFields.map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`c-${f.key}`}>{f.label}</Label>
          {f.rows === 1
            ? <Input id={`c-${f.key}`} value={values[f.key] ?? ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })}/>
            : <Textarea id={`c-${f.key}`} rows={f.rows} value={values[f.key] ?? ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })}/>}
          {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
        </div>
      ))}
      <Button onClick={save} disabled={busy || content.isLoading}>{busy ? 'جارٍ الحفظ…' : 'حفظ النصوص'}</Button>
    </div>
  );
}

/* ---------------- Team ---------------- */

const roleLabels: Record<'none' | Role, string> = { none: 'بدون صلاحية', editor: 'محرر (الوظائف والنصوص)', admin: 'مدير (كل الصلاحيات)' };

function TeamAdmin({ selfId }: { selfId: string }) {
  const queryClient = useQueryClient();
  const team = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from('profiles').select('id, email, created_at').order('created_at'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      return profiles.data.map(p => {
        const r = roles.data.filter(x => x.user_id === p.id).map(x => x.role as Role);
        return { ...p, role: (r.includes('admin') ? 'admin' : r.includes('editor') ? 'editor' : 'none') as 'none' | Role };
      });
    },
  });

  async function setRole(userId: string, role: 'none' | Role) {
    const del = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (del.error) { toast.error('تعذّر تغيير الصلاحية'); return; }
    if (role !== 'none') {
      const ins = await supabase.from('user_roles').insert({ user_id: userId, role });
      if (ins.error) { toast.error('تعذّر تغيير الصلاحية'); return; }
    }
    toast.success('تم تحديث الصلاحية');
    queryClient.invalidateQueries({ queryKey: ['admin', 'team'] });
  }

  return (
    <div className="admin-panel">
      <h2 className="text-lg font-semibold">المشرفون</h2>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">لإضافة مشرف: اطلب منه إنشاء حساب من صفحة الدخول، ثم امنحه الصلاحية هنا.</p>
      <div className="divide-y">
        {team.data?.map(m => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1 truncate text-sm" dir="ltr">{m.email}</span>
            {m.id === selfId ? <span className="text-xs text-muted-foreground">{roleLabels[m.role]} (أنت)</span> : (
              <select aria-label={`صلاحية ${m.email}`} className="rounded-md border bg-background px-2 py-1.5 text-sm" value={m.role} onChange={e => setRole(m.id, e.target.value as 'none' | Role)}>
                {(Object.keys(roleLabels) as ('none' | Role)[]).map(k => <option key={k} value={k}>{roleLabels[k]}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
