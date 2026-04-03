import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { profile } from '@/data/portfolio';
import { deletePost, fetchPostById, savePost, uploadCoverImage } from '@/lib/firestore-blog';
import {
  estimateReadingTime,
  formatPublishDate,
  parseTags,
  slugify,
  type BlogPostInput,
  type BlogStatus,
} from '@/lib/blog';
import {
  clearAdminMessage,
  ensureAdminAccess,
  getConfigErrorMessage,
  setAdminMessage,
  setButtonBusy,
} from './admin-auth';

type EditorMode = 'new' | 'edit';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateTime(value: Date) {
  return value.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function getEditIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  return last === 'edit' ? '' : last;
}

function getPreviewMarkup(values: BlogPostInput) {
  const safeContent = DOMPurify.sanitize(marked.parse(values.content || '') as string);
  const tags = values.tags
    .map((tag) => `<li>${escapeHtml(tag)}</li>`)
    .join('');
  const cover = values.coverImage
    ? `<div class="adminPreviewCover"><img src="${escapeHtml(values.coverImage)}" alt="${escapeHtml(values.title || 'Cover image')}" /></div>`
    : '';
  const publishLabel =
    values.status === 'published' && values.publishedAt
      ? formatPublishDate(values.publishedAt)
      : values.status === 'published'
        ? 'Ready to publish'
        : 'Draft';

  return `
    <div class="adminPreviewHero">
      ${cover}
      <div class="adminPreviewMeta">
        <span>${escapeHtml(values.authorName || profile.name)}</span>
        <span>${escapeHtml(publishLabel)}</span>
        <span>${estimateReadingTime(values.content)} min read</span>
      </div>
      <h2 class="adminPreviewTitle">${escapeHtml(values.title || 'Untitled post')}</h2>
      <p class="adminPreviewExcerpt">${escapeHtml(values.excerpt || 'Write a short excerpt to improve cards, SEO, and social sharing.')}</p>
      ${values.tags.length ? `<ul class="adminPreviewTags">${tags}</ul>` : ''}
    </div>
    <div class="adminPreviewBody">${safeContent || '<p>Add Markdown content to see a live preview here.</p>'}</div>
  `;
}

function setDisabledState(elements: Array<HTMLElement | null>, disabled: boolean) {
  elements.forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || element instanceof HTMLButtonElement) {
      element.disabled = disabled;
    }
  });
}

export async function initAdminEditorPage(mode: EditorMode) {
  const feedback = document.getElementById('admin-editor-feedback');
  const previewRoot = document.getElementById('admin-preview-root');
  const readingTime = document.getElementById('admin-editor-reading-time');
  const updatedAt = document.getElementById('admin-editor-updated-at');
  const uploadFeedback = document.getElementById('admin-upload-feedback');
  const liveLink = document.getElementById('admin-live-link') as HTMLAnchorElement | null;
  const deleteButton = document.getElementById('admin-delete-post') as HTMLButtonElement | null;
  const publishButton = document.getElementById('admin-publish-post') as HTMLButtonElement | null;
  const saveButton = document.getElementById('admin-save-post') as HTMLButtonElement | null;
  const uploadButton = document.getElementById('admin-upload-cover') as HTMLButtonElement | null;
  const generateSlugButton = document.getElementById('admin-generate-slug') as HTMLButtonElement | null;
  const form = document.getElementById('admin-post-form') as HTMLFormElement | null;

  const titleInput = document.getElementById('admin-post-title') as HTMLInputElement | null;
  const authorInput = document.getElementById('admin-post-author') as HTMLInputElement | null;
  const slugInput = document.getElementById('admin-post-slug') as HTMLInputElement | null;
  const excerptInput = document.getElementById('admin-post-excerpt') as HTMLTextAreaElement | null;
  const tagsInput = document.getElementById('admin-post-tags') as HTMLInputElement | null;
  const statusInput = document.getElementById('admin-post-status') as HTMLSelectElement | null;
  const dateInput = document.getElementById('admin-post-date') as HTMLInputElement | null;
  const coverInput = document.getElementById('admin-post-cover') as HTMLInputElement | null;
  const coverFileInput = document.getElementById('admin-post-cover-file') as HTMLInputElement | null;
  const contentInput = document.getElementById('admin-post-content') as HTMLTextAreaElement | null;
  const seoTitleInput = document.getElementById('admin-post-seo-title') as HTMLInputElement | null;
  const seoDescriptionInput = document.getElementById('admin-post-seo-description') as HTMLTextAreaElement | null;

  if (
    !form ||
    !previewRoot ||
    !titleInput ||
    !authorInput ||
    !slugInput ||
    !excerptInput ||
    !tagsInput ||
    !statusInput ||
    !dateInput ||
    !coverInput ||
    !coverFileInput ||
    !contentInput ||
    !seoTitleInput ||
    !seoDescriptionInput
  ) {
    return;
  }

  const access = await ensureAdminAccess();
  if (access.status !== 'authorized') {
    if (access.status === 'config-missing') {
      setAdminMessage(feedback, getConfigErrorMessage(), 'error');
    }

    setDisabledState(
      [
        titleInput,
        authorInput,
        slugInput,
        excerptInput,
        tagsInput,
        statusInput,
        dateInput,
        coverInput,
        coverFileInput,
        contentInput,
        seoTitleInput,
        seoDescriptionInput,
        saveButton,
        publishButton,
        uploadButton,
        deleteButton,
        generateSlugButton,
      ],
      true,
    );
    return;
  }

  let currentId = mode === 'edit' ? getEditIdFromPath() : '';
  let currentCollection: 'posts' | 'blogPosts' = 'posts';
  let slugDirty = false;

  authorInput.value = profile.name;

  const updatePreviewAndMeta = () => {
    const values: BlogPostInput = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim() || slugify(titleInput.value),
      excerpt: excerptInput.value.trim(),
      content: contentInput.value,
      tags: parseTags(tagsInput.value),
      coverImage: coverInput.value.trim(),
      status: (statusInput.value as BlogStatus) || 'draft',
      publishedAt: toIsoDateTime(dateInput.value),
      authorName: authorInput.value.trim() || profile.name,
      seoTitle: seoTitleInput.value.trim(),
      seoDescription: seoDescriptionInput.value.trim(),
    };

    previewRoot.innerHTML = getPreviewMarkup(values);
    if (readingTime) {
      readingTime.textContent = `Estimated reading time: ${estimateReadingTime(values.content)} min read`;
    }

    if (liveLink && values.slug && values.status === 'published') {
      liveLink.hidden = false;
      liveLink.href = `/blog/${values.slug}`;
    } else if (liveLink) {
      liveLink.hidden = true;
    }
  };

  const populateForm = (post: Awaited<ReturnType<typeof fetchPostById>>) => {
    if (!post) {
      return;
    }

    titleInput.value = post.title;
    authorInput.value = post.authorName || profile.name;
    slugInput.value = post.slug;
    excerptInput.value = post.description || post.excerpt;
    tagsInput.value = post.tags.join(', ');
    statusInput.value = post.status;
    dateInput.value = toLocalDateTimeInput(post.publishedAt);
    coverInput.value = post.coverImage || '';
    contentInput.value = post.content;
    seoTitleInput.value = post.seoTitle || '';
    seoDescriptionInput.value = post.seoDescription || '';
    slugDirty = true;

    if (updatedAt) {
      updatedAt.textContent = `Last saved: ${post.updatedAt ? formatDateTime(new Date(post.updatedAt)) : 'just now'}`;
    }
  };

  const buildPayload = (forcedStatus?: BlogStatus): BlogPostInput => ({
    title: titleInput.value.trim(),
    slug: slugInput.value.trim() || slugify(titleInput.value),
    excerpt: excerptInput.value.trim(),
    content: contentInput.value.trim(),
    tags: parseTags(tagsInput.value),
    coverImage: coverInput.value.trim(),
    status: forcedStatus || ((statusInput.value as BlogStatus) || 'draft'),
    publishedAt: toIsoDateTime(dateInput.value),
    authorName: authorInput.value.trim() || profile.name,
    seoTitle: seoTitleInput.value.trim(),
    seoDescription: seoDescriptionInput.value.trim(),
  });

  const showSavedState = (message: string) => {
    setAdminMessage(feedback, message, 'success');
    if (updatedAt) {
      updatedAt.textContent = `Last saved: ${formatDateTime(new Date())}`;
    }
  };

  const attachPreviewEvents = [titleInput, authorInput, slugInput, excerptInput, tagsInput, statusInput, dateInput, coverInput, contentInput, seoTitleInput, seoDescriptionInput];
  attachPreviewEvents.forEach((element) => {
    element.addEventListener('input', updatePreviewAndMeta);
    element.addEventListener('change', updatePreviewAndMeta);
  });

  titleInput.addEventListener('input', () => {
    if (!slugDirty) {
      slugInput.value = slugify(titleInput.value);
    }
  });

  slugInput.addEventListener('input', () => {
    slugDirty = true;
  });

  generateSlugButton?.addEventListener('click', () => {
    slugDirty = false;
    slugInput.value = slugify(titleInput.value);
    updatePreviewAndMeta();
  });

  uploadButton?.addEventListener('click', async () => {
    const file = coverFileInput.files?.[0];
    if (!file) {
      setAdminMessage(feedback, 'Choose an image file before uploading a cover image.', 'error');
      return;
    }

    clearAdminMessage(feedback);
    if (uploadFeedback) {
      uploadFeedback.textContent = 'Uploading cover image to Firebase Storage...';
    }

    setButtonBusy(uploadButton, true, 'Uploading...');

    try {
      const slug = slugify(slugInput.value || titleInput.value || 'blog-post');
      const url = await uploadCoverImage(file, slug);
      coverInput.value = url;
      if (uploadFeedback) {
        uploadFeedback.textContent = 'Cover image uploaded successfully and applied to the post.';
      }
      setAdminMessage(feedback, 'Cover image uploaded successfully.', 'success');
      updatePreviewAndMeta();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to upload the cover image right now.';
      setAdminMessage(feedback, message, 'error');
      if (uploadFeedback) {
        uploadFeedback.textContent =
          'Optional. Uploaded files are stored under `blog-covers/` and the public URL is applied automatically.';
      }
    } finally {
      setButtonBusy(uploadButton, false);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAdminMessage(feedback);

    const payload = buildPayload();
    if (!payload.title || !payload.excerpt || !payload.content) {
      setAdminMessage(feedback, 'Title, excerpt, and article content are required.', 'error');
      return;
    }

    setButtonBusy(saveButton, true, 'Saving...');

    try {
      const savedPost = await savePost(payload, access.user, currentId ? { id: currentId, collectionName: currentCollection } : undefined);
      if (!currentId) {
        window.location.replace(`/admin/posts/edit/${savedPost.id}?saved=1`);
        return;
      }

      currentId = savedPost.id;
      currentCollection = savedPost.collectionName;
      showSavedState(payload.status === 'published' ? 'Post saved and published.' : 'Draft saved successfully.');
      updatePreviewAndMeta();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save the post right now.';
      setAdminMessage(feedback, message, 'error');
    } finally {
      setButtonBusy(saveButton, false);
    }
  });

  publishButton?.addEventListener('click', async () => {
    clearAdminMessage(feedback);

    const payload = buildPayload('published');
    if (!payload.title || !payload.excerpt || !payload.content) {
      setAdminMessage(feedback, 'Title, excerpt, and article content are required before publishing.', 'error');
      return;
    }

    if (!dateInput.value) {
      dateInput.value = toLocalDateTimeInput(new Date().toISOString());
    }
    statusInput.value = 'published';
    updatePreviewAndMeta();

    setButtonBusy(publishButton, true, 'Publishing...');

    try {
      const savedPost = await savePost(buildPayload('published'), access.user, currentId ? { id: currentId, collectionName: currentCollection } : undefined);
      if (!currentId) {
        window.location.replace(`/admin/posts/edit/${savedPost.id}?saved=1`);
        return;
      }

      currentId = savedPost.id;
      currentCollection = savedPost.collectionName;
      showSavedState('Post saved and published.');
      updatePreviewAndMeta();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to publish the post right now.';
      setAdminMessage(feedback, message, 'error');
    } finally {
      setButtonBusy(publishButton, false);
    }
  });

  deleteButton?.addEventListener('click', async () => {
    if (!currentId) {
      setAdminMessage(feedback, 'This post has not been created yet, so there is nothing to delete.', 'error');
      return;
    }

    const confirmed = window.confirm(
      'Delete this post? This removes the Firestore document and attempts to remove any uploaded cover image.',
    );
    if (!confirmed) {
      return;
    }

    setButtonBusy(deleteButton, true, 'Deleting...');

    try {
      await deletePost(currentId, coverInput.value.trim(), currentCollection);
      window.location.assign('/admin/posts?deleted=1');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to delete the post right now.';
      setAdminMessage(feedback, message, 'error');
      setButtonBusy(deleteButton, false);
    }
  });

  if (mode === 'edit') {
    if (!currentId) {
      setAdminMessage(feedback, 'No post id was found in the edit URL.', 'error');
      setDisabledState([saveButton, publishButton, uploadButton, deleteButton], true);
      updatePreviewAndMeta();
      return;
    }

    try {
      const post = await fetchPostById(currentId);
      if (!post) {
        setAdminMessage(feedback, 'This Firestore post could not be found.', 'error');
        setDisabledState([saveButton, publishButton, uploadButton, deleteButton], true);
        updatePreviewAndMeta();
        return;
      }

      currentCollection = post.firestoreCollection || 'posts';
      populateForm(post);

      if (new URLSearchParams(window.location.search).get('saved') === '1') {
        setAdminMessage(feedback, 'Post saved successfully.', 'success');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load the existing post from Firestore.';
      setAdminMessage(feedback, message, 'error');
    }
  }

  updatePreviewAndMeta();
}



