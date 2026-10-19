import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageBand, Stats } from '@/components/portal';
import { pageHead } from '@/lib/portal-data';
import { useSiteText } from '@/lib/site-queries';

export const Route = createFileRoute('/about')({ head: () => pageHead('عن محاسبون', 'محاسبون منصة عربية للمعرفة المحاسبية والتطور المهني.'), component: About });

function About() {
  const text = useSiteText();
  const blocks = text('about_body').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return (
    <>
      <PageBand title={text('about_title', 'عن محاسبون')} subtitle={text('about_subtitle')}/>
      <section className="section page-container">
        <div className="reading-content">
          {blocks.map((block, i) => {
            const [first = '', ...rest] = block.split('\n');
            if (first.startsWith('## ')) return <div key={i}><h2>{first.slice(3)}</h2>{rest.length > 0 && <p className="whitespace-pre-line">{rest.join('\n')}</p>}</div>;
            return <p key={i} className="whitespace-pre-line">{block}</p>;
          })}
          <Button asChild><Link to="/articles">استكشف المقالات<ArrowLeft/></Link></Button>
        </div>
      </section>
      <Stats/>
    </>
  );
}
