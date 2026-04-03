import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { fetchPublishedPostBySlug, fetchPublishedPosts } from '@/lib/firestore-blog';
import { formatPublishDate, type BlogPostRecord } from '@/lib/blog';
import { siteMeta } from '@/data/portfolio';

type SeedPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  date: string | null;
  tags: string[];
  readingTime: number;
  coverImage?: string;
  authorName: string;
  source: 'markdown' | 'firestore';
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSlugFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function shareButtons(url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return `
    <div class="blogShareRow">
      <span class="blogShareLabel">Share this post</span>
      <a class="shareButton" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noreferrer">LinkedIn</a>
      <a class="shareButton" href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" rel="noreferrer">X / Twitter</a>
      <a class="shareButton" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noreferrer">Facebook</a>
      <button class="shareButton" type="button" data-copy-link="${escapeHtml(url)}">Copy Link</button>
    </div>
  `;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;
}

function updateMeta(post: BlogPostRecord, canonicalUrl: string) {
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.description;
  const image = post.coverImage || `${window.location.origin}${siteMeta.defaultImage}`;
  const publishTime = post.date || post.publishedAt || new Date().toISOString();

  document.title = `${title} | Blog`;
  upsertCanonical(canonicalUrl);

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
  upsertMeta('meta[property="article:published_time"]', {
    property: 'article:published_time',
    content: publishTime,
  });
  upsertMeta('meta[property="article:author"]', {
    property: 'article:author',
    content: post.authorName,
  });
  upsertMeta('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: description,
  });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
}

function normalizeSeedPost(post: SeedPost): BlogPostRecord {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    description: post.description,
    date: post.date,
    content: '',
    source: post.source,
    excerpt: post.description,
    tags: post.tags,
    coverImage: post.coverImage || '',
    status: 'published',
    publishedAt: post.date,
    createdAt: post.date,
    updatedAt: post.date,
    authorName: post.authorName,
    readingTime: post.readingTime,
    seoTitle: post.title,
    seoDescription: post.description,
    migratedFrom: null,
  };
}

function readMarkdownSeed() {
  const source = document.getElementById('blog-markdown-seed');
  if (!source?.textContent) {
    return [] as BlogPostRecord[];
  }

  return (JSON.parse(source.textContent) as SeedPost[]).map(normalizeSeedPost);
}

function renderCard(post: BlogPostRecord) {
  const tags = post.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
  const media = post.coverImage
    ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" />`
    : '<span>Article</span>';

  return `
    <a class="blogListCard" href="/blog/${escapeHtml(post.slug)}">
      <div class="blogListMedia">${media}</div>
      <div class="blogListContent">
        <div class="blogListMeta">
          <span>${formatPublishDate(post.date || post.publishedAt)}</span>
          <span>${post.readingTime} min read</span>
        </div>
        <h3 class="blogListTitle">${escapeHtml(post.title)}</h3>
        <p class="blogListDescription">${escapeHtml(post.description)}</p>
        <ul class="blogListTags">${tags}</ul>
      </div>
    </a>
  `;
}

function mergePosts(localPosts: BlogPostRecord[], remotePosts: BlogPostRecord[]) {
  const merged = new Map<string, BlogPostRecord>();

  localPosts.forEach((post) => merged.set(post.slug, post));
  remotePosts.forEach((post) => merged.set(post.slug, post));

  return [...merged.values()].sort(
    (a, b) => new Date(b.date || b.publishedAt || 0).valueOf() - new Date(a.date || a.publishedAt || 0).valueOf(),
  );
}

function renderPost(post: BlogPostRecord, allPosts: BlogPostRecord[]) {
  const container = document.getElementById('dynamic-blog-post');
  if (!container) {
    return;
  }

  const canonicalUrl = `${window.location.origin}/blog/${post.slug}`;
  const safeHtml = DOMPurify.sanitize(marked.parse(post.content) as string);
  const relatedPosts = allPosts
    .filter((entry) => entry.slug !== post.slug)
    .filter((entry) => entry.tags.some((tag) => post.tags.includes(tag)))
    .slice(0, 3);

  const currentIndex = allPosts.findIndex((entry) => entry.slug === post.slug);
  const previousPost = currentIndex >= 0 ? allPosts[currentIndex + 1] ?? null : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] ?? null : null;

  const cover = post.coverImage
    ? `<div class="blogPostCover"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" /></div>`
    : '';

  const tags = post.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');
  const related = relatedPosts.map(renderCard).join('');
  const pager = `
    <div class="blogPagerGrid">
      ${
        previousPost
          ? `<a class="blogPagerCard" href="/blog/${escapeHtml(previousPost.slug)}"><span>Previous post</span><strong>${escapeHtml(previousPost.title)}</strong></a>`
          : '<div></div>'
      }
      ${
        nextPost
          ? `<a class="blogPagerCard" href="/blog/${escapeHtml(nextPost.slug)}"><span>Next post</span><strong>${escapeHtml(nextPost.title)}</strong></a>`
          : ''
      }
    </div>
  `;

  container.innerHTML = `
    <a class="blogBackLink" href="/blog">Back to Blog</a>
    <div class="blogPostHero">
      ${cover}
      <div>
        <span class="eyebrow">Article</span>
        <h1 class="blogPostTitle">${escapeHtml(post.title)}</h1>
        <p class="blogPostExcerpt">${escapeHtml(post.description)}</p>
        <div class="blogMetaRow">
          <strong>${escapeHtml(post.authorName)}</strong>
          <span>${formatPublishDate(post.date || post.publishedAt)}</span>
          <span>${post.readingTime} min read</span>
        </div>
        <ul class="chipList">${tags}</ul>
        ${shareButtons(canonicalUrl, post.title)}
      </div>
    </div>
    <div class="blogBodyWrap">
      <div class="blogBody richText">${safeHtml}</div>
      ${shareButtons(canonicalUrl, post.title)}
    </div>
    ${
      relatedPosts.length
        ? `<section class="blogRelatedSection"><div class="blogSectionRow"><h2>Related posts</h2></div><div class="blogGrid">${related}</div></section>`
        : ''
    }
    ${
      previousPost || nextPost
        ? `<section class="blogPagerSection"><div class="blogSectionRow"><h2>Continue reading</h2></div>${pager}</section>`
        : ''
    }
  `;

  updateMeta(post, canonicalUrl);
}

function renderNotFound() {
  const container = document.getElementById('dynamic-blog-post');
  if (container) {
    container.innerHTML = `
      <a class="blogBackLink" href="/blog">Back to Blog</a>
      <div class="blogStateCard">This Firestore-backed post could not be found or is not published.</div>
    `;
  }
}

export async function initDynamicBlogPostPage() {
  const slug = getSlugFromPath();
  if (!slug) {
    renderNotFound();
    return;
  }

  try {
    const post = await fetchPublishedPostBySlug(slug);
    if (!post) {
      renderNotFound();
      return;
    }

    const allPosts = mergePosts(readMarkdownSeed(), await fetchPublishedPosts());
    renderPost(post, allPosts);
  } catch (error) {
    console.error('Failed to load blog post from Firestore.', error);
    renderNotFound();
  }
}
