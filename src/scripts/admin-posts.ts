import { deletePost, fetchAdminPosts, savePost } from '@/lib/firestore-blog';
import { formatPublishDate, sortPostsByDate, type BlogPostInput, type BlogPostRecord } from '@/lib/blog';
import {
  clearAdminMessage,
  ensureAdminAccess,
  getConfigErrorMessage,
  setAdminMessage,
  setButtonBusy,
} from './admin-auth';

type AdminPost = BlogPostRecord & {
  migrationState?: 'available' | 'migrated';
  migratedFirestoreId?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setMetric(selector: string, value: number) {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = String(value);
  }
}

function readMarkdownPosts() {
  const source = document.getElementById('admin-markdown-posts');
  if (!source?.textContent) {
    return [] as BlogPostRecord[];
  }

  return JSON.parse(source.textContent) as BlogPostRecord[];
}

function combinePosts(markdownPosts: BlogPostRecord[], firestorePosts: BlogPostRecord[]) {
  const firestoreBySlug = new Map(firestorePosts.map((post) => [post.slug, post]));
  const firestoreByMarkdownId = new Map(
    firestorePosts
      .filter((post) => post.migratedFrom?.markdownId)
      .map((post) => [post.migratedFrom?.markdownId || '', post]),
  );

  const hydratedMarkdown = markdownPosts.map((post) => {
    const migratedPost = firestoreByMarkdownId.get(post.id) || firestoreBySlug.get(post.slug);
    return {
      ...post,
      migrationState: migratedPost ? 'migrated' : 'available',
      migratedFirestoreId: migratedPost?.id || null,
    } satisfies AdminPost;
  });

  return sortPostsByDate([...firestorePosts, ...hydratedMarkdown]);
}

function renderPosts(posts: AdminPost[]) {
  const target = document.getElementById('admin-posts-list');
  if (!target) {
    return;
  }

  if (!posts.length) {
    target.innerHTML =
      '<div class="adminStateCard">No posts yet. Use "New Post" to create a browser-managed article or migrate an existing Markdown file.</div>';
    return;
  }

  target.innerHTML = posts
    .map((post) => {
      const sourceBadge = `<span class="adminSourceTag" data-source="${escapeHtml(post.source)}">${post.source === 'firestore' ? 'Firestore' : 'Markdown'}</span>`;
      const statusBadge = `<span class="adminStatusTag" data-status="${escapeHtml(post.status)}">${escapeHtml(post.status)}</span>`;
      const codeTooltip = 'This post is managed in code (src/content/blog)';
      const migrateButton =
        post.source === 'markdown'
          ? post.migrationState === 'migrated'
            ? '<button class="buttonOutline" type="button" disabled title="Already migrated to Firestore">Migrated</button>'
            : `<button class="buttonPrimary" type="button" data-migrate-markdown="${escapeHtml(post.id)}">Migrate to Firestore</button>`
          : '';
      const editAction =
        post.source === 'firestore'
          ? `<a class="buttonOutline" href="/admin/posts/edit/${escapeHtml(post.id)}">Edit</a>`
          : `<button class="buttonOutline adminButtonDisabled" type="button" disabled title="${codeTooltip}">Edit in code</button>`;
      const deleteAction =
        post.source === 'firestore'
          ? `<button class="adminButtonDanger" type="button" data-delete-post="${escapeHtml(post.id)}" data-cover-image="${escapeHtml(post.coverImage || '')}" data-firestore-collection="${escapeHtml(post.firestoreCollection || 'posts')}">Delete</button>`
          : '';
      const sourceMeta =
        post.source === 'markdown'
          ? `<span title="${codeTooltip}">Source file: ${escapeHtml(post.codePath || 'src/content/blog')}</span>`
          : `<span>Collection: ${escapeHtml(post.firestoreCollection || 'posts')}</span>`;
      const migrationMeta =
        post.source === 'markdown' && post.migrationState === 'migrated'
          ? '<span>Migration status: Firestore copy available</span>'
          : '';

      return `
        <article class="adminPostCard">
          <div class="adminPostTop">
            <div>
              <div class="adminBadgeRow">${sourceBadge}${statusBadge}</div>
              <h3>${escapeHtml(post.title)}</h3>
            </div>
          </div>

          <p>${escapeHtml(post.description || post.seoDescription)}</p>

          <div class="adminPostMeta">
            <span>Slug: /blog/${escapeHtml(post.slug)}</span>
            <span>Published: ${escapeHtml(formatPublishDate(post.date || post.publishedAt))}</span>
            <span>Updated: ${escapeHtml(formatPublishDate(post.updatedAt || post.date))}</span>
            <span>Reading time: ${post.readingTime} min read</span>
            ${sourceMeta}
            ${migrationMeta}
          </div>

          <ul class="adminPostTags">
            ${post.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}
          </ul>

          <div class="adminPostActions">
            ${editAction}
            ${
              post.status === 'published'
                ? `<a class="buttonPrimary" href="/blog/${escapeHtml(post.slug)}" target="_blank" rel="noreferrer">View Live</a>`
                : ''
            }
            ${migrateButton}
            ${deleteAction}
          </div>
        </article>
      `;
    })
    .join('');
}

function toMigrationPayload(post: BlogPostRecord): BlogPostInput {
  return {
    title: post.title,
    slug: post.slug,
    description: post.description,
    excerpt: post.description,
    content: post.content,
    tags: post.tags,
    coverImage: post.coverImage,
    status: 'published',
    publishedAt: post.date,
    authorName: post.authorName,
    seoTitle: post.seoTitle || post.title,
    seoDescription: post.seoDescription || post.description,
    migratedFrom: {
      markdownId: post.id,
      codePath: post.codePath || 'src/content/blog',
    },
  };
}

export async function initAdminPostsPage() {
  const feedback = document.getElementById('admin-posts-feedback');
  const access = await ensureAdminAccess();

  if (access.status !== 'authorized') {
    if (access.status === 'config-missing') {
      setAdminMessage(feedback, getConfigErrorMessage(), 'error');
    }
    return;
  }

  const markdownPosts = readMarkdownPosts();
  let firestorePosts: BlogPostRecord[] = [];
  let combinedPosts: AdminPost[] = [];

  const refreshPosts = async () => {
    firestorePosts = await fetchAdminPosts();
    combinedPosts = combinePosts(markdownPosts, firestorePosts);

    setMetric('[data-posts-total]', combinedPosts.length);
    setMetric('[data-posts-firestore]', firestorePosts.length);
    setMetric('[data-posts-markdown]', markdownPosts.length);
    renderPosts(combinedPosts);
  };

  try {
    await refreshPosts();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load posts right now.';
    setAdminMessage(feedback, message, 'error');
  }

  document.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const deleteButton = target.closest('[data-delete-post]') as HTMLButtonElement | null;
    if (deleteButton) {
      const id = deleteButton.dataset.deletePost;
      const coverImage = deleteButton.dataset.coverImage || '';
      const collectionName = (deleteButton.dataset.firestoreCollection || 'posts') as 'posts' | 'blogPosts';

      if (!id) {
        return;
      }

      const confirmed = window.confirm(
        'Delete this Firestore post? This removes the document and tries to remove any uploaded cover image as well.',
      );
      if (!confirmed) {
        return;
      }

      clearAdminMessage(feedback);
      deleteButton.disabled = true;

      try {
        await deletePost(id, coverImage, collectionName);
        setAdminMessage(feedback, 'Post deleted successfully.', 'success');
        await refreshPosts();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to delete the post right now.';
        setAdminMessage(feedback, message, 'error');
        deleteButton.disabled = false;
      }

      return;
    }

    const migrateButton = target.closest('[data-migrate-markdown]') as HTMLButtonElement | null;
    if (migrateButton) {
      const markdownId = migrateButton.dataset.migrateMarkdown;
      const markdownPost = markdownPosts.find((post) => post.id === markdownId);
      if (!markdownPost) {
        return;
      }

      const confirmed = window.confirm(
        `Migrate "${markdownPost.title}" into Firestore? The Markdown file will remain in the repo until you remove it manually.`,
      );
      if (!confirmed) {
        return;
      }

      clearAdminMessage(feedback);
      setButtonBusy(migrateButton, true, 'Migrating...');

      try {
        await savePost(toMigrationPayload(markdownPost), access.user);
        setAdminMessage(feedback, 'Markdown post migrated to Firestore.', 'success');
        await refreshPosts();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to migrate the Markdown post right now.';
        setAdminMessage(feedback, message, 'error');
      } finally {
        setButtonBusy(migrateButton, false);
      }

      return;
    }

    const bulkButton = target.closest('#admin-migrate-all-markdown') as HTMLButtonElement | null;
    if (!bulkButton) {
      return;
    }

    const pendingMarkdownPosts = combinedPosts.filter(
      (post) => post.source === 'markdown' && post.migrationState !== 'migrated',
    );

    if (!pendingMarkdownPosts.length) {
      setAdminMessage(feedback, 'All Markdown posts already have Firestore copies.', 'info');
      return;
    }

    const confirmed = window.confirm(
      `Migrate ${pendingMarkdownPosts.length} Markdown post(s) into Firestore? Existing Markdown files will stay in the repo until you remove them manually.`,
    );
    if (!confirmed) {
      return;
    }

    clearAdminMessage(feedback);
    setButtonBusy(bulkButton, true, 'Migrating...');

    try {
      for (const post of pendingMarkdownPosts) {
        await savePost(toMigrationPayload(post), access.user);
      }

      setAdminMessage(feedback, 'Markdown posts migrated to Firestore.', 'success');
      await refreshPosts();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to finish the Markdown migration.';
      setAdminMessage(feedback, message, 'error');
    } finally {
      setButtonBusy(bulkButton, false);
    }
  });
}
