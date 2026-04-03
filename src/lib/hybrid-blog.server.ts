import { getCollection, type CollectionEntry } from 'astro:content';
import { profile } from '@/data/portfolio';
import {
  estimateReadingTime,
  mergePosts,
  type BlogPostRecord,
  type FirestoreCollectionName,
} from './blog';

const FIRESTORE_COLLECTIONS: FirestoreCollectionName[] = ['posts', 'blogPosts'];
const firestoreProjectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
const firestoreApiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;

interface FirestoreDocument {
  name: string;
  createTime?: string;
  updateTime?: string;
  fields?: Record<string, FirestoreValue>;
}

type FirestoreValue =
  | { stringValue?: string }
  | { timestampValue?: string }
  | { arrayValue?: { values?: FirestoreValue[] } }
  | { mapValue?: { fields?: Record<string, FirestoreValue> } }
  | { integerValue?: string }
  | { doubleValue?: number }
  | { nullValue?: null };

export type MarkdownEntry = CollectionEntry<'blog'>;

function getString(value: FirestoreValue | undefined) {
  return 'stringValue' in (value || {}) ? value.stringValue || '' : '';
}

function getTimestamp(value: FirestoreValue | undefined) {
  return 'timestampValue' in (value || {}) ? value.timestampValue || null : null;
}

function getNumber(value: FirestoreValue | undefined) {
  if ('integerValue' in (value || {})) {
    return Number(value.integerValue || 0);
  }

  if ('doubleValue' in (value || {})) {
    return Number(value.doubleValue || 0);
  }

  return 0;
}

function getStringArray(value: FirestoreValue | undefined) {
  if (!value || !('arrayValue' in value)) {
    return [];
  }

  return (value.arrayValue?.values || []).map((entry) => getString(entry)).filter(Boolean);
}

function getMap(value: FirestoreValue | undefined) {
  if (!value || !('mapValue' in value)) {
    return null;
  }

  return value.mapValue?.fields || null;
}

function toDocId(name: string) {
  const parts = name.split('/');
  return parts[parts.length - 1] || name;
}

function mapFirestoreDocument(document: FirestoreDocument, collectionName: FirestoreCollectionName) {
  const fields = document.fields || {};
  const title = getString(fields.title);
  const description = getString(fields.description) || getString(fields.excerpt);
  const content = getString(fields.content);
  const publishedAt = getTimestamp(fields.publishedAt);
  const createdAt = getTimestamp(fields.createdAt) || document.createTime || null;
  const updatedAt = getTimestamp(fields.updatedAt) || document.updateTime || null;
  const migrationFields = getMap(fields.migratedFrom);

  return {
    id: toDocId(document.name),
    title,
    slug: getString(fields.slug),
    description,
    date: publishedAt || createdAt || updatedAt,
    content,
    source: 'firestore' as const,
    excerpt: description,
    tags: getStringArray(fields.tags),
    coverImage: getString(fields.coverImage),
    status: (getString(fields.status) || 'draft') as BlogPostRecord['status'],
    publishedAt,
    createdAt,
    updatedAt,
    authorName: getString(fields.authorName) || profile.name,
    readingTime: getNumber(fields.readingTime) || estimateReadingTime(content),
    seoTitle: getString(fields.seoTitle) || title,
    seoDescription: getString(fields.seoDescription) || description,
    firestoreCollection: collectionName,
    migratedFrom: migrationFields
      ? {
          markdownId: getString(migrationFields.markdownId),
          codePath: getString(migrationFields.codePath),
          migratedAt: getTimestamp(migrationFields.migratedAt),
        }
      : null,
  } satisfies BlogPostRecord;
}

async function fetchPublishedCollection(collectionName: FirestoreCollectionName) {
  if (!firestoreProjectId) {
    return [] as BlogPostRecord[];
  }

  const url = `https://firestore.googleapis.com/v1/projects/${firestoreProjectId}/databases/(default)/documents:runQuery${firestoreApiKey ? `?key=${firestoreApiKey}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
        orderBy: [{ field: { fieldPath: 'publishedAt' }, direction: 'DESCENDING' }],
      },
    }),
  });

  if (!response.ok) {
    return [] as BlogPostRecord[];
  }

  const rows = (await response.json()) as Array<{ document?: FirestoreDocument }>;
  return rows
    .flatMap((row) => (row.document ? [mapFirestoreDocument(row.document, collectionName)] : []))
    .filter((post) => post.slug && post.status === 'published');
}

export async function getPublishedMarkdownEntries() {
  return getCollection('blog', ({ data }) => !data.draft);
}

export async function getPublishedMarkdownEntryMap() {
  const entries = await getPublishedMarkdownEntries();
  return new Map(entries.map((entry) => [entry.slug, entry]));
}

export async function getMarkdownPosts() {
  const entries = await getPublishedMarkdownEntries();

  return entries.map((entry) => ({
    id: entry.id,
    title: entry.data.title,
    slug: entry.slug,
    description: entry.data.description,
    date: entry.data.publishDate.toISOString(),
    content: entry.body,
    source: 'markdown' as const,
    excerpt: entry.data.description,
    tags: entry.data.tags,
    coverImage: entry.data.image || '',
    status: 'published' as const,
    publishedAt: entry.data.publishDate.toISOString(),
    createdAt: entry.data.publishDate.toISOString(),
    updatedAt: entry.data.publishDate.toISOString(),
    authorName: profile.name,
    readingTime: estimateReadingTime(entry.body),
    seoTitle: entry.data.title,
    seoDescription: entry.data.description,
    codePath: `src/content/blog/${entry.id}.md`,
    migratedFrom: null,
  })) satisfies BlogPostRecord[];
}

export async function getPublishedFirestorePostsServer() {
  const collections = await Promise.all(FIRESTORE_COLLECTIONS.map(fetchPublishedCollection));
  return mergePosts(collections.flat());
}

export async function getAllPosts() {
  const [markdownPosts, firestorePosts] = await Promise.all([
    getMarkdownPosts(),
    getPublishedFirestorePostsServer(),
  ]);

  return mergePosts([...markdownPosts, ...firestorePosts]);
}
