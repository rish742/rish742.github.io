# Blog Admin Notes

## What Changed

- Redesigned the public blog list and article experience with a stronger editorial layout, cleaner cards, improved article spacing, related posts, previous/next navigation, and share buttons.
- Added a Firebase-backed admin experience inside the site:
  - `/admin/login`
  - `/admin`
  - `/admin/posts`
  - `/admin/posts/new`
  - `/admin/posts/edit/[id]` via Firebase Hosting rewrite to the static editor shell
- Added Firebase Auth-based route protection for the admin area.
- Added Firestore storage and editing flows for blog posts, including draft/published status, slug management, SEO fields, and optional Firebase Storage cover-image uploads.
- Added Firestore rules, Storage rules, indexes, and a rules-generation script so the allowed admin email is enforced in both the UI and Firebase security rules.

## Required Env Vars

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`
- `PUBLIC_ALLOWED_ADMIN_EMAIL`

## Allowed Admin Email

Set `PUBLIC_ALLOWED_ADMIN_EMAIL` in your local `.env` file or CI/CD build environment.

During `npm run build`, the `scripts/generate-firebase-rules.mjs` script injects that email into `firestore.rules` and `storage.rules`.

If you change the allowed admin email, rebuild and redeploy so the generated rules are updated too.

## Firebase Console Steps

1. Create or open your Firebase project.
2. Enable Google sign-in under Authentication.
3. Create a Firestore database.
4. Create a Storage bucket if you want uploaded cover images.
5. Add your Hosting site/domain as an authorized domain in Firebase Authentication if needed.
6. Deploy with `npm run deploy` after your env vars are set.

## Firestore Model

Collection: `blogPosts`

Main fields:

- `title`
- `slug`
- `excerpt`
- `content`
- `tags`
- `coverImage`
- `status`
- `publishedAt`
- `updatedAt`
- `authorName`
- `authorEmail`
- `readingTime`
- `seoTitle`
- `seoDescription`

## Hosting and Routing

- The site remains fully static and Firebase Hosting-friendly.
- Static Markdown posts are still built by Astro at build time.
- Firestore-managed posts are served through the static `/blog/post/index.html` shell, with Firebase Hosting rewrites handling unknown `/blog/*` URLs.
- `/admin/posts/edit/[id]` is handled through a static Astro editor shell plus a Hosting rewrite.

## Assumptions and TODOs

- Google sign-in is the only admin sign-in method implemented. This satisfies the requested "Google and/or email-password" requirement via Google.
- Static Markdown posts remain code-managed and are not editable through the Firestore admin UI.
- Firestore-backed public posts update metadata client-side. This works well for readers, but purely static/social crawler behavior is still strongest for the build-time Markdown posts. If you eventually want perfect crawler-rendered OG metadata for Firestore-only posts, that would require a server-side or pre-render sync step beyond plain static hosting.
