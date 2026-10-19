import { useState } from 'react';
import { createFileRoute, Link, notFound, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Building2, Check, CheckCircle2, ClipboardList, Clock3, Copy, FileText, Mail, MapPin, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobRow } from '@/components/portal';
import { applicationSteps, getJob, pageHead, relatedJobs } from '@/lib/portal-data';
import { jobsQuery, useJobs } from '@/lib/site-queries';

export const Route = createFileRoute('/jobs/$jobId')({
  loader: async ({ params, context }) => {
    const job = getJob(params.jobId, await context.queryClient.ensureQueryData(jobsQuery));
    if (!job) throw notFound();
    return job;
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageHead(`وظيفة ${loaderData.title}`, `${loaderData.company} في ${loaderData.location} — الوصف الكامل والمؤهلات المطلوبة وطريقة التقديم.`)
      : pageHead('وظيفة غير متاحة', 'لم نعثر على هذه الوظيفة. تصفح جميع الفرص الوظيفية المتاحة.'),
  component: JobDetail,
  errorComponent: JobDetailError,
  notFoundComponent: JobNotFound,
});

function JobDetail() {
  const job = Route.useLoaderData();
  const related = relatedJobs(job, useJobs());
  const facts = [
    { icon: Building2, label: 'جهة العمل', value: job.company },
    { icon: MapPin, label: 'الموقع', value: `${job.location}، السعودية` },
    { icon: BriefcaseBusiness, label: 'نوع الوظيفة', value: job.employmentType },
    { icon: ClipboardList, label: 'المجال', value: job.role },
    { icon: Clock3, label: 'سنوات الخبرة', value: job.experience },
  ];
  return (
    <>
      <section className="page-title-band">
        <div className="page-container">
          <Button asChild variant="link" className="mb-4 px-0">
            <Link to="/jobs"><ArrowRight size={15}/>العودة إلى الفرص الوظيفية</Link>
          </Button>
          <div className="job-detail-head">
            <div className="company-icon"><Building2 size={28} strokeWidth={1.5}/></div>
            <div>
              <span className="category-label" data-tone="green">{job.employmentType}</span>
              <h1 className="mt-3 text-3xl font-semibold leading-relaxed">{job.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{job.company} · {job.location}، السعودية</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section page-container job-detail-grid">
        <div className="job-detail-main">
          <section className="detail-block">
            <h2>عن الوظيفة</h2>
            {job.description.map(p => <p key={p.slice(0, 14)}>{p}</p>)}
            <div className="mt-4 flex flex-wrap gap-2">{job.tags.map(t => <span key={t} className="category-label">{t}</span>)}</div>
          </section>

          <section className="detail-block">
            <h2>المسؤوليات الرئيسية</h2>
            <ul className="detail-list">{job.responsibilities.map(r => <li key={r}><FileText size={15}/>{r}</li>)}</ul>
          </section>

          <section className="detail-block">
            <h2>المؤهلات المطلوبة</h2>
            <ul className="detail-list">{job.qualifications.map(q => <li key={q}><CheckCircle2 size={16}/>{q}</li>)}</ul>
          </section>

          <section className="detail-block apply-block">
            <h2>طريقة التقديم</h2>
            <ol className="step-list">{applicationSteps.map(s => <li key={s}>{s}</li>)}</ol>
            <h3>المستندات المطلوبة</h3>
            <ul className="detail-list">{job.applyDocs.map(d => <li key={d}><CheckCircle2 size={16}/>{d}</li>)}</ul>
            <div className="apply-cta">
              <span className="flex items-center gap-3">
                <Mail size={18} className="text-primary"/>
                <span><span className="block text-[11px] text-muted-foreground">بريد التقديم</span><span dir="ltr" className="apply-email">{job.applyEmail}</span></span>
              </span>
              <CopyEmailButton email={job.applyEmail}/>
            </div>
            <p className="apply-note">وظيفة من المحتوى التجريبي للمنصة؛ بريد التقديم أعلاه للتوضيح ولا يستقبل طلبات حقيقية.</p>
          </section>
        </div>

        <aside className="job-detail-aside">
          <div className="apply-card">
            <h3>ملخص الفرصة</h3>
            <dl>
              {facts.map(f => <div key={f.label} className="apply-fact"><f.icon size={15}/><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
            </dl>
            <CopyEmailButton email={job.applyEmail} className="mt-4 w-full"/>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">اكتب رقم الوظيفة <strong className="text-primary">{job.id}</strong> في عنوان الرسالة حتى يمكن تتبع طلبك.</p>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="section page-container border-t">
          <h2 className="section-heading mb-6">وظائف مشابهة</h2>
          <div className="space-y-3">{related.map(r => <JobRow key={r.id} job={r}/>)}</div>
        </section>
      )}
    </>
  );
}

function CopyEmailButton({ email, className = '' }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const field = document.createElement('textarea');
        field.value = email;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.insetInlineStart = '-9999px';
        document.body.appendChild(field);
        field.select();
        ok = document.execCommand('copy');
        document.body.removeChild(field);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };
  return (
    <Button type="button" variant={copied ? 'outline' : 'default'} className={className} onClick={copy}>
      {copied ? <Check size={16}/> : <Copy size={16}/>}
      {copied ? 'تم نسخ البريد' : 'نسخ البريد'}
    </Button>
  );
}

function JobNotFound() {
  return (
    <section className="section page-container">
      <div className="job-empty">
        <SearchX size={36} className="mx-auto mb-4 text-muted-foreground"/>
        <h1 className="mb-2 text-2xl font-semibold">لم نعثر على هذه الوظيفة</h1>
        <p className="mb-5 text-sm text-muted-foreground">ربما حُذفت الوظيفة أو انتهت فترة التقديم أو كان الرابط غير صحيح.</p>
        <Button asChild variant="outline"><Link to="/jobs">تصفح جميع الوظائف<ArrowRight/></Link></Button>
      </div>
    </section>
  );
}

function JobDetailError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <section className="section page-container">
      <div className="job-empty">
        <AlertTriangle size={36} className="mx-auto mb-4 text-muted-foreground"/>
        <h1 className="mb-2 text-2xl font-semibold">تعذّر تحميل هذه الوظيفة</h1>
        <p className="mb-5 text-sm text-muted-foreground">{error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء تحميل الصفحة.'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>إعادة المحاولة</Button>
          <Button asChild variant="outline"><Link to="/jobs">تصفح جميع الوظائف</Link></Button>
        </div>
      </div>
    </section>
  );
}
