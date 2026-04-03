import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, isFirebaseConfigured, storage } from './firebase';
import {
  estimateReadingTime,
  mergePosts,
  normalizePostInput,
  sortPostsByDate,
  type BlogPostInput,
  type BlogPostRecord,
  type FirestoreCollectionName,
} from './blog';

const primaryCollectionName: FirestoreCollectionName = 'posts';
const legacyCollectionName: FirestoreCollectionName = 'blogPosts';
const readCollections: FirestoreCollectionName[] = [primaryCollectionName, legacyCollectionName];

function timestampToIso(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
}

function mapDoc(
  snapshot: { id: string; data: () => Record<string, unknown> },
  collectionName: FirestoreCollectionName,
): BlogPostRecord {
  const data = snapshot.data();
  const description = String(data.description || data.excerpt || '');
  const content = String(data.content || '');

  return {
    id: snapshot.id,
    title: String(data.title || ''),
    slug: String(data.slug || ''),
    description,
    date:
      timestampToIso(data.publishedAt) ||
      timestampToIso(data.createdAt) ||
      timestampToIso(data.updatedAt),
    content,
    source: 'firestore',
    excerpt: description,
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : [],
    coverImage: String(data.coverImage || ''),
    status: (data.status as BlogPostRecord['status']) || 'draft',
    publishedAt: timestampToIso(data.publishedAt),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    authorName: String(data.authorName || 'Rishab Khatokar'),
    readingTime: Number(data.readingTime || estimateReadingTime(content)),
    seoTitle: String(data.seoTitle || data.title || ''),
    seoDescription: String(data.seoDescription || description || ''),
    firestoreCollection: collectionName,
    migratedFrom:
      data.migratedFrom && typeof data.migratedFrom === 'object'
        ? {
            markdownId: String((data.migratedFrom as Record<string, unknown>).markdownId || ''),
            codePath: String((data.migratedFrom as Record<string, unknown>).codePath || ''),
            migratedAt: timestampToIso((data.migratedFrom as Record<string, unknown>).migratedAt),
          }
        : null,
  };
}

async function fetchCollectionPosts(collectionName: FirestoreCollectionName, publishedOnly: boolean) {
  if (!db || !isFirebaseConfigured) {
    return [] as BlogPostRecord[];
  }

  const constraints = publishedOnly
    ? [where('status', '==', 'published'), orderBy('publishedAt', 'desc')]
    : [orderBy('updatedAt', 'desc')];

  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
  return snapshot.docs.map((entry) => mapDoc(entry, collectionName));
}

async function fetchPostBySlugFromCollection(collectionName: FirestoreCollectionName, slug: string) {
  if (!db || !isFirebaseConfigured) {
    return null;
  }

  const postQuery = query(
    collection(db, collectionName),
    where('status', '==', 'published'),
    where('slug', '==', slug),
    limit(1),
  );

  const snapshot = await getDocs(postQuery);
  return snapshot.empty ? null : mapDoc(snapshot.docs[0], collectionName);
}

export async function fetchPublishedPosts() {
  const collections = await Promise.all(readCollections.map((name) => fetchCollectionPosts(name, true)));
  return mergePosts(collections.flat());
}

export async function fetchPublishedPostBySlug(slug: string) {
  const results = await Promise.all(readCollections.map((name) => fetchPostBySlugFromCollection(name, slug)));
  return mergePosts(results.filter(Boolean) as BlogPostRecord[])[0] || null;
}

export async function fetchAdminPosts() {
  const collections = await Promise.all(readCollections.map((name) => fetchCollectionPosts(name, false)));
  return sortPostsByDate(mergePosts(collections.flat()));
}

export async function fetchPostById(id: string) {
  if (!db || !isFirebaseConfigured) {
    return null;
  }

  for (const collectionName of readCollections) {
    const snapshot = await getDoc(doc(db, collectionName, id));
    if (snapshot.exists()) {
      return mapDoc(snapshot, collectionName);
    }
  }

  return null;
}

async function assertUniqueSlug(slug: string, currentId?: string, currentCollection?: FirestoreCollectionName) {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firestore is not configured.');
  }

  const snapshots = await Promise.all(
    readCollections.map((collectionName) =>
      getDocs(query(collection(db, collectionName), where('slug', '==', slug), limit(1))).then(
        (snapshot) => ({ collectionName, snapshot }),
      ),
    ),
  );

  for (const { collectionName, snapshot } of snapshots) {
    const existing = snapshot.docs[0];
    if (!existing) {
      continue;
    }

    const isCurrentDocument = existing.id === currentId && collectionName === currentCollection;
    if (!isCurrentDocument) {
      throw new Error('Another Firestore post already uses this slug. Choose a different slug.');
    }
  }
}

export async function savePost(
  input: BlogPostInput,
  user: User,
  target?: { id?: string; collectionName?: FirestoreCollectionName },
) {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firestore is not configured.');
  }

  const post = normalizePostInput(input);
  const targetCollection = target?.collectionName || primaryCollectionName;
  await assertUniqueSlug(post.slug, target?.id, targetCollection);

  const payload = {
    title: post.title,
    slug: post.slug,
    description: post.description || post.excerpt || '',
    excerpt: post.excerpt || post.description || '',
    content: post.content,
    tags: post.tags,
    coverImage: post.coverImage || '',
    status: post.status,
    publishedAt: post.publishedAt ? Timestamp.fromDate(new Date(post.publishedAt)) : null,
    updatedAt: serverTimestamp(),
    authorName: post.authorName,
    authorEmail: user.email || '',
    readingTime: estimateReadingTime(post.content),
    seoTitle: post.seoTitle || post.title,
    seoDescription: post.seoDescription || post.description || '',
    migratedFrom: post.migratedFrom
      ? {
          markdownId: post.migratedFrom.markdownId,
          codePath: post.migratedFrom.codePath,
          migratedAt: serverTimestamp(),
        }
      : null,
  };

  if (target?.id) {
    await updateDoc(doc(db, targetCollection, target.id), payload);
    return { id: target.id, collectionName: targetCollection };
  }

  const created = await addDoc(collection(db, primaryCollectionName), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return { id: created.id, collectionName: primaryCollectionName };
}

export async function deletePost(
  id: string,
  coverImage?: string,
  collectionName: FirestoreCollectionName = primaryCollectionName,
) {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firestore is not configured.');
  }

  await deleteDoc(doc(db, collectionName, id));

  if (coverImage && storage && coverImage.includes('/blog-covers/')) {
    try {
      const pathFragment = decodeURIComponent(coverImage.split('/o/')[1]?.split('?')[0] || '');
      if (pathFragment) {
        await deleteObject(ref(storage, pathFragment));
      }
    } catch (error) {
      console.warn('Failed to delete cover image from Storage.', error);
    }
  }
}

export async function uploadCoverImage(file: File, slug: string) {
  if (!storage || !isFirebaseConfigured) {
    throw new Error('Firebase Storage is not configured.');
  }

  const safeSlug = slug || 'draft-post';
  const storageRef = ref(storage, `blog-covers/${safeSlug}/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
