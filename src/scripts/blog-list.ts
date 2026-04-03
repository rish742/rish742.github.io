import { fetchPublishedPosts } from '@/lib/firestore-blog';
import type { BlogPostRecord } from '@/lib/blog';

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

function formatDate(value: string | null) {
  if (!value) {
    return 'Draft';
  }

  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderFeatured(post: SeedPost) {
  const media = post.coverImage
    ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" />`
    : '';

  const tags = post.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');

  return `
    <a class="blogFeatureCard" href="/blog/${escapeHtml(post.slug)}">
      <div class="blogFeatureMedia">${media}</div>
      <div class="blogFeatureContent">
        <div class="blogMetaRow">
          <span>${formatDate(post.date)}</span>
          <span>${post.readingTime} min read</span>
          <strong>${escapeHtml(post.authorName)}</strong>
        </div>
        <h2 class="blogFeatureTitle">${escapeHtml(post.title)}</h2>
        <p class="blogFeatureExcerpt">${escapeHtml(post.description)}</p>
        <ul class="chipList">${tags}</ul>
      </div>
    </a>
  `;
}

function renderCard(post: SeedPost) {
  const media = post.coverImage
    ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" />`
    : '<span>Article</span>';

  const tags = post.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('');

  return `
    <a class="blogListCard" href="/blog/${escapeHtml(post.slug)}">
      <div class="blogListMedia">${media}</div>
      <div class="blogListContent">
        <div class="blogListMeta">
          <span>${formatDate(post.date)}</span>
          <span>${post.readingTime} min read</span>
        </div>
        <h3 class="blogListTitle">${escapeHtml(post.title)}</h3>
        <p class="blogListDescription">${escapeHtml(post.description)}</p>
        <ul class="blogListTags">${tags}</ul>
      </div>
    </a>
  `;
}

function normalizeRemotePost(post: BlogPostRecord): SeedPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    tags: post.tags,
    readingTime: post.readingTime,
    coverImage: post.coverImage,
    authorName: post.authorName,
    source: 'firestore',
  };
}

function sortPosts(posts: SeedPost[]) {
  return [...posts].sort((a, b) => new Date(b.date || 0).valueOf() - new Date(a.date || 0).valueOf());
}

function mergeSeedAndRemote(seedPosts: SeedPost[], remotePosts: BlogPostRecord[]) {
  const merged = new Map<string, SeedPost>();

  seedPosts.forEach((post) => merged.set(post.slug, post));
  remotePosts.map(normalizeRemotePost).forEach((post) => merged.set(post.slug, post));

  return sortPosts([...merged.values()]);
}

function readSeedPosts() {
  const source = document.getElementById('blog-seed-data');

  if (!source?.textContent) {
    return [];
  }

  return JSON.parse(source.textContent) as SeedPost[];
}

function renderPosts(posts: SeedPost[]) {
  const featuredSlot = document.getElementById('blog-featured-slot');
  const listSlot = document.getElementById('blog-list-slot');
  if (!featuredSlot || !listSlot) {
    return;
  }

  if (!posts.length) {
    featuredSlot.innerHTML = '<div class="blogStateCard">No published posts are available yet.</div>';
    listSlot.innerHTML = '';
    return;
  }

  featuredSlot.innerHTML = renderFeatured(posts[0]);
  listSlot.innerHTML = posts.slice(1).map(renderCard).join('');
}

export async function initBlogIndexPage() {
  const seedPosts = sortPosts(readSeedPosts());
  if (seedPosts.length) {
    renderPosts(seedPosts);
  }

  try {
    const remotePosts = await fetchPublishedPosts();
    if (remotePosts.length) {
      renderPosts(mergeSeedAndRemote(seedPosts, remotePosts));
    }
  } catch (error) {
    console.warn('Firestore posts could not be loaded for the blog index.', error);
  }
}
