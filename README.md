# Rishab Khatokar Portfolio

Static Astro portfolio and blog, with a Firebase-backed in-site admin for Firestore blog posts.

## Local Dev

Run `npm install`.

Create a local `.env` file from `.env.example` and fill in the Firebase public keys plus `PUBLIC_ALLOWED_ADMIN_EMAIL`.

Run `npm run dev`.

## Build

Run `npm run build` to:

1. generate `firestore.rules` and `storage.rules` from the templates
2. build the static Astro site into `dist/`

Run `npm run preview` to preview the production build locally.

## Deploy

Make sure your `.env` values are present in the environment where the build runs.

Run `npm run deploy` to build and deploy Hosting, Firestore rules/indexes, and Storage rules.

If you prefer separate steps:

1. `npm run build`
2. `firebase deploy --only hosting,firestore,storage`

## Firebase Setup

Enable Google sign-in in Firebase Authentication.

Create a Firestore database and deploy the included indexes and security rules.

Create a Firebase Storage bucket if you want admin-uploaded cover images.

Set `PUBLIC_ALLOWED_ADMIN_EMAIL` to the single email address that should have admin access. The same value is embedded into the generated Firestore and Storage rules during build.

## Notes

Static Markdown posts still live in `src/content/blog/*`.

Admin-created posts live in the Firestore `blogPosts` collection and are rendered through the Firestore-backed blog route.

See `BLOG_ADMIN_NOTES.md` for the detailed blog/admin implementation notes and deployment checklist.
