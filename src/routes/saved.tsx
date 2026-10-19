import { createFileRoute } from '@tanstack/react-router';
import { ArticleBrowser, PageBand } from '@/components/portal';
import { pageHead } from '@/lib/portal-data';
export const Route = createFileRoute('/saved')({ head: () => pageHead('المقالات المحفوظة', 'مقالاتك المحاسبية المفضلة في مكان واحد.'), component: Saved });
function Saved() { return <><PageBand title="مقالاتك المحفوظة" subtitle="معرفة تستحق العودة إليها. محفوظاتك متاحة خلال هذه الجلسة."/><section className="section page-container"><ArticleBrowser savedOnly/></section></>; }