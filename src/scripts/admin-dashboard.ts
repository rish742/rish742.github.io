import { fetchAdminPosts } from '@/lib/firestore-blog';
import { formatPublishDate, type BlogPostRecord } from '@/lib/blog';
import { ensureAdminAccess, getConfigErrorMessage, setAdminMessage } from './admin-auth';

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

function renderRecentPosts(posts: BlogPostRecord[]) {
  const target = document.getElementById('admin-dashboard-recent');
  if (!target) {
    return;
  }

  if (!posts.length) {
    target.innerHTML =
      '<div class="adminStateCard">No Firestore posts yet. Create your first post to start using the in-site editorial workflow.</div>';
    return;
  }

  target.innerHTML = posts
    .slice(0, 4)
    .map(
      (post) => `
        <article class="adminPostCard">
          <div class="adminPostTop">
            <div>
              <h3>${escapeHtml(post.title)}</h3>
            </div>
            <span class="adminStatusTag" data-status="${escapeHtml(post.status)}">${escapeHtml(post.status)}</span>
          </div>
          <div class="adminPostMeta">
            <span>Published: ${escapeHtml(formatPublishDate(post.publishedAt))}</span>
            <span>Reading time: ${post.readingTime} min read</span>
          </div>
          <div class="adminPostActions">
            <a class="buttonOutline" href="/admin/posts/edit/${escapeHtml(post.id)}">Edit</a>
            ${
              post.status === 'published'
                ? `<a class="buttonPrimary" href="/blog/${escapeHtml(post.slug)}" target="_blank" rel="noreferrer">View Live</a>`
                : ''
            }
          </div>
        </article>
      `,
    )
    .join('');
}

export async function initAdminDashboardPage() {
  const feedback = document.getElementById('admin-dashboard-feedback');
  const access = await ensureAdminAccess();

  if (access.status !== 'authorized') {
    if (access.status === 'config-missing') {
      setAdminMessage(feedback, getConfigErrorMessage(), 'error');
    }
    return;
  }

  try {
    const posts = await fetchAdminPosts();
    const publishedCount = posts.filter((post) => post.status === 'published').length;
    const draftCount = posts.length - publishedCount;

    setMetric('[data-dashboard-total]', posts.length);
    setMetric('[data-dashboard-published]', publishedCount);
    setMetric('[data-dashboard-drafts]', draftCount);
    renderRecentPosts(posts);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to load Firestore posts for the dashboard right now.';
    setAdminMessage(feedback, message, 'error');
  }
}
