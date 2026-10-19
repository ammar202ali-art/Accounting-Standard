import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { getSiteContent, listJobs, listWpPosts, type WpPost } from '@/lib/site.functions';
import { articles, type Article } from '@/lib/portal-data';

export const jobsQuery = queryOptions({ queryKey: ['jobs'], queryFn: () => listJobs(), staleTime: 60_000 });
export const contentQuery = queryOptions({ queryKey: ['site-content'], queryFn: () => getSiteContent(), staleTime: 60_000 });
export const wpPostsQuery = queryOptions({ queryKey: ['wp-posts'], queryFn: () => listWpPosts(), staleTime: 60_000 });

export const WP_PREFIX = 'wp-';

export function wpToArticle(p: WpPost): Article {
  return {
    id: `${WP_PREFIX}${p.slug}`,
    title: p.title,
    category: p.category,
    tone: 'blue',
    icon: FileText,
    description: p.excerpt,
    author: p.author,
    initials: p.author.slice(0, 2),
    minutes: p.minutes,
    image: p.image,
  };
}

export function useJobs() {
  return useSuspenseQuery(jobsQuery).data;
}

export function useSiteText() {
  const { data } = useSuspenseQuery(contentQuery);
  return (key: string, fallback = '') => data[key]?.trim() || fallback;
}

/** WordPress articles first, followed by the built-in sample library. */
export function useAllArticles(): Article[] {
  const { data } = useSuspenseQuery(wpPostsQuery);
  return [...data.map(wpToArticle), ...articles];
}
