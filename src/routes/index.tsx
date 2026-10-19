import { createFileRoute } from "@tanstack/react-router";
import { Link } from '@tanstack/react-router';
import { ArrowLeft, BookOpen, BriefcaseBusiness, Sparkles, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleBrowser, JobBrowser, Stats } from '@/components/portal';
import { pageHead } from '@/lib/portal-data';
import { useSiteText } from '@/lib/site-queries';
import workspace from '@/assets/accounting-workspace.jpg';
export const Route = createFileRoute("/")({
  head: () => pageHead('المعرفة المحاسبية والتطور المهني', 'اكتشف المقالات المحاسبية والمعايير الدولية والفرص المهنية مع محاسبون.'),
  component: Index,
});
function Index() {
  const text = useSiteText();
  return <><section className="hero"><img className="hero-image" src={workspace} width={1536} height={1024} alt="مساحة عمل محاسبية حديثة مع تقارير مالية وآلة حاسبة"/><div className="page-container hero-content"><div className="eyebrow mb-3"><span className="size-1.5 rounded-full bg-primary"/>المعرفة التي ترتقي بمسيرتك</div><h1 className="hero-title">محاسبون<span className="text-primary">.</span><br/><span className="text-[35px] max-sm:text-[28px]">{text('home_tagline', 'معرفة أعمق. مستقبل أوضح.')}</span></h1><p className="hero-copy mt-3 whitespace-pre-line text-muted-foreground">{text('home_intro')}</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/articles"><BookOpen/>استكشف المقالات<ArrowLeft/></Link></Button><Button asChild size="lg" variant="outline"><Link to="/jobs"><BriefcaseBusiness/>الفرص الوظيفية</Link></Button></div></div></section><Stats/><section className="section page-container"><div className="mb-6 flex items-center justify-between gap-4"><div><div className="eyebrow mb-1">رؤى ومعرفة</div><h2 className="section-heading">أحدث المقالات المحاسبية</h2><p className="mt-2 text-xs text-muted-foreground">أفكار متجددة ومعرفة عملية من عالم المحاسبة والمال.</p></div><Button asChild variant="link" className="px-0"><Link to="/articles">جميع المقالات<ArrowLeft/></Link></Button></div><ArticleBrowser compact/></section><section className="section border-t bg-secondary/40"><div className="page-container"><div className="mb-6 flex items-center justify-between gap-4"><div><div className="eyebrow mb-1">خطوتك القادمة</div><h2 className="section-heading">فرص تليق بطموحك</h2><p className="mt-2 text-xs text-muted-foreground">اكتشف فرصًا مهنية في المحاسبة والمالية.</p></div><Button asChild variant="link" className="px-0"><Link to="/jobs">جميع الوظائف<ArrowLeft/></Link></Button></div><JobBrowser compact/></div></section><section className="border-t bg-brand-soft"><div className="page-container flex flex-col items-start justify-between gap-5 py-8 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><Sparkles className="shrink-0 text-primary" size={30}/><div><h2 className="text-xl font-semibold">{text('home_cta_title', 'استثمر في معرفتك، كل يوم.')}</h2><p className="mt-2 text-xs text-muted-foreground">{text('home_cta_text')}</p></div></div><Button asChild variant="outline"><Link to="/articles">اكتشف مكتبة المقالات<ChevronLeft/></Link></Button></div></section></>;
}
