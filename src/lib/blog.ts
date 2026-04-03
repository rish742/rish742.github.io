export type BlogStatus = 'draft' | 'published';
export type BlogPostSource = 'markdown' | 'firestore';
export type FirestoreCollectionName = 'posts' | 'blogPosts';

export interface BlogMigrationMetadata {
  markdownId: string;
  codePath: string;
  migratedAt?: string | null;
}

export interface BlogPostRecord {
  id: string;
  title: string;
  slug: string;
  description: string;
  date: string | null;
  content: string;
  source: BlogPostSource;
  excerpt: string;
  tags: string[];
  coverImage: string;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  authorName: string;
  readingTime: number;
  seoTitle: string;
  seoDescription: string;
  codePath?: string;
  firestoreCollection?: FirestoreCollectionName;
  migratedFrom?: BlogMigrationMetadata | null;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  description?: string;
  excerpt?: string;
  content: string;
  tags: string[];
  coverImage?: string;
  status: BlogStatus;
  publishedAt?: string | null;
  authorName: string;
  seoTitle?: string;
  seoDescription?: string;
  migratedFrom?: BlogMigrationMetadata | null;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseTags(input: string | string[]) {
  if (Array.isArray(input)) {
    return input.map((tag) => tag.trim()).filter(Boolean);
  }

  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function estimateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function resolvePostDate(
  post: Pick<BlogPostRecord, 'date' | 'publishedAt' | 'createdAt' | 'updatedAt'>,
) {
  return post.date || post.publishedAt || post.createdAt || post.updatedAt || null;
}

export function sortPostsByDate<
  T extends Pick<BlogPostRecord, 'date' | 'publishedAt' | 'createdAt' | 'updatedAt'>,
>(posts: T[]) {
  return [...posts].sort((a, b) => {
    const left = resolvePostDate(a);
    const right = resolvePostDate(b);

    return new Date(right || 0).valueOf() - new Date(left || 0).valueOf();
  });
}

function pickPreferredPost(current: BlogPostRecord, incoming: BlogPostRecord) {
  if (incoming.source === 'firestore' && current.source !== 'firestore') {
    return incoming;
  }

  if (incoming.source !== 'firestore' && current.source === 'firestore') {
    return current;
  }

  const currentDate = resolvePostDate(current);
  const incomingDate = resolvePostDate(incoming);
  return new Date(incomingDate || 0).valueOf() > new Date(currentDate || 0).valueOf()
    ? incoming
    : current;
}

export function mergePosts(posts: BlogPostRecord[]) {
  const merged = new Map<string, BlogPostRecord>();

  posts.forEach((post) => {
    const existing = merged.get(post.slug);
    merged.set(post.slug, existing ? pickPreferredPost(existing, post) : post);
  });

  return sortPostsByDate([...merged.values()]);
}

export function formatPublishDate(value: string | null) {
  if (!value) {
    return 'Draft';
  }

  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function toCanonicalPostUrl(slug: string) {
  return `/blog/${slug}`;
}

export function normalizePostInput(input: BlogPostInput): BlogPostInput {
  const title = input.title.trim();
  const description = (input.description ?? input.excerpt ?? '').trim();
  const content = input.content.trim();
  const tags = parseTags(input.tags);
  const slug = slugify(input.slug || title);

  return {
    ...input,
    title,
    description,
    excerpt: description,
    content,
    tags,
    slug,
    status: input.status,
    coverImage: input.coverImage?.trim() ?? '',
    seoTitle: input.seoTitle?.trim() || title,
    seoDescription: input.seoDescription?.trim() || description,
    publishedAt: input.status === 'published' ? input.publishedAt || new Date().toISOString() : null,
    authorName: input.authorName.trim(),
    migratedFrom: input.migratedFrom ?? null,
  };
}
