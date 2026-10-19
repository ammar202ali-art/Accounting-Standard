import { createFileRoute, stripSearchParams, useNavigate } from '@tanstack/react-router';
import { fallback, zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';
import { JobBrowser, PageBand } from '@/components/portal';
import { ALL_FILTERS, defaultJobFilters, pageHead, type JobFilters } from '@/lib/portal-data';

const jobsSearchSchema = z.object({
  location: fallback(z.string(), '').default(''),
  role: fallback(z.string(), '').default(''),
  type: fallback(z.string(), '').default(''),
});

export const Route = createFileRoute('/jobs/')({
  validateSearch: zodValidator(jobsSearchSchema),
  search: { middlewares: [stripSearchParams({ location: '', role: '', type: '' })] },
  head: () => pageHead('الفرص الوظيفية', 'اكتشف فرص العمل في المحاسبة والمالية في الرياض وجدة والدمام، مع فلاتر للموقع والمسمى الوظيفي ونوع الوظيفة.'),
  component: Jobs,
});

function Jobs() {
  const { location, role, type } = Route.useSearch();
  const navigate = useNavigate({ from: '/jobs/' });
  const filters: JobFilters = {
    location: location || defaultJobFilters.location,
    role: role || defaultJobFilters.role,
    type: type || defaultJobFilters.type,
  };
  const setFilters = (next: JobFilters) =>
    navigate({
      search: {
        location: next.location === ALL_FILTERS ? '' : next.location,
        role: next.role === ALL_FILTERS ? '' : next.role,
        type: next.type === ALL_FILTERS ? '' : next.type,
      },
      replace: true,
    });
  return (
    <>
      <PageBand title="فرص تليق بطموحك" subtitle="خطوتك التالية في عالم المحاسبة والمالية تبدأ هنا."/>
      <section className="section page-container">
        <JobBrowser filters={filters} onFiltersChange={setFilters}/>
      </section>
    </>
  );
}
