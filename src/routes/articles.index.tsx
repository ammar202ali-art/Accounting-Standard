import { createFileRoute } from '@tanstack/react-router';
import { ArticleBrowser, PageBand } from '@/components/portal';
import { pageHead } from '@/lib/portal-data';
export const Route = createFileRoute('/articles/')({ head: () => pageHead('مكتبة المقالات', 'مقالات متخصصة في المحاسبة والضرائب والتحليل المالي والمعايير الدولية.'), component: Articles });
function Articles() { return <><PageBand title="مكتبة المقالات" subtitle="معرفة عملية ورؤى متخصصة لتطوير مسيرتك المحاسبية."/><section className="section page-container"><ArticleBrowser/></section></>; }