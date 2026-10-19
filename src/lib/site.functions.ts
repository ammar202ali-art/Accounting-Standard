import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { jobFromRow, type Job } from '@/lib/portal-data';

// WordPress.com site that publishes Mohasiboon articles.
const WP_SITE_ID = '257985019';
const WP_GATEWAY = 'https://connector-gateway.lovable.dev/wordpress_com';

function publicClient() {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization');
        h.set('apikey', key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listJobs = createServerFn({ method: 'GET' }).handler(async (): Promise<Job[]> => {
  const { data, error } = await publicClient().from('jobs').select('*').eq('published', true).order('id');
  if (error) {
    console.error('listJobs failed', error);
    return [];
  }
  return data.map(jobFromRow);
});

export const getSiteContent = createServerFn({ method: 'GET' }).handler(async (): Promise<Record<string, string>> => {
  const { data, error } = await publicClient().from('site_content').select('key, value');
  if (error) {
    console.error('getSiteContent failed', error);
    return {};
  }
  return Object.fromEntries(data.map(r => [r.key, r.value]));
});

export type WpPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  html: string;
  date: string;
  image: string;
  author: string;
  category: string;
  minutes: number;
  editUrl: string;
};

const decode = (s: string) =>
  s.replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();

type RawPost = {
  ID: number; slug: string; title: string; excerpt: string; content: string; date: string; featured_image: string;
  author?: { name?: string }; categories?: Record<string, { name: string }>;
};

function mapPost(p: RawPost): WpPost {
  const text = decode(p.content ?? '');
  const cats = Object.values(p.categories ?? {}).map(c => decode(c.name)).filter(c => c && c !== 'Uncategorized' && c !== 'غير مصنف');
  return {
    id: p.ID,
    slug: p.slug,
    title: decode(p.title) || 'بدون عنوان',
    excerpt: decode(p.excerpt).slice(0, 220) || text.slice(0, 220),
    html: p.content ?? '',
    date: p.date,
    image: p.featured_image ?? '',
    author: p.author?.name ?? 'فريق محاسبون',
    category: cats[0] ?? 'مقالات',
    minutes: Math.max(1, Math.round(text.split(' ').length / 180)),
    editUrl: `https://wordpress.com/post/mohasiboon.wordpress.com/${p.ID}`,
  };
}

async function wpFetch(path: string, query: Record<string, string>) {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const wpKey = process.env['WORDPRESS_COM_API_KEY'];
  if (!lovableKey || !wpKey) throw new Error('WordPress connection is not configured');
  const res = await fetch(`${WP_GATEWAY}/rest/v1.1/sites/${WP_SITE_ID}${path}?${new URLSearchParams(query)}`, {
    headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': wpKey },
  });
  if (!res.ok) throw new Error(`WordPress request failed [${res.status}]: ${await res.text()}`);
  return res.json();
}

const FIELDS = 'ID,slug,title,excerpt,content,date,featured_image,author,categories';

export const listWpPosts = createServerFn({ method: 'GET' }).handler(async (): Promise<WpPost[]> => {
  try {
    const data = (await wpFetch('/posts', { number: '50', status: 'publish', fields: FIELDS })) as { posts: RawPost[] };
    return data.posts.map(mapPost);
  } catch (e) {
    console.error('listWpPosts failed', e);
    return [];
  }
});

export const getWpPost = createServerFn({ method: 'GET' })
  .inputValidator((input: { slug: string }) => {
    if (!/^[a-z0-9%\-_]{1,200}$/i.test(input.slug)) throw new Error('Invalid slug');
    return input;
  })
  .handler(async ({ data }): Promise<WpPost | null> => {
    try {
      const p = (await wpFetch(`/posts/slug:${data.slug}`, { fields: FIELDS })) as RawPost;
      return mapPost(p);
    } catch (e) {
      console.error('getWpPost failed', e);
      return null;
    }
  });
