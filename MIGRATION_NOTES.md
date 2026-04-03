# Migration Notes

## What Changed

- Rebuilt the portfolio as a static Astro site with reusable layouts, components, and Markdown-powered blog content.
- Replaced the old Bootstrap, jQuery, WOW, Owl Carousel, Isotope, and template-driven asset stack with plain CSS and lightweight Astro pages.
- Moved served images, favicon, and the public resume PDF into `public/` for clean static hosting.
- Added multi-page routes for home, about, projects, blog, resume, and contact.
- Added reusable SEO metadata, Open Graph tags, sitemap support, and `robots.txt`.
- Added Firebase Hosting configuration targeting Astro's static `dist/` output.

## What Was Preserved

- The original orange accent color, dark hero treatment, rounded badges/buttons, muted gray text, and overall spacing rhythm.
- The central hero with background image, profile-led about section, timeline-style resume content, and card-based project presentation.
- The `RishabRK.tech` brand direction from the original site.

## Assumptions And TODOs

- `https://rishabrk.tech` was used as the site URL because the legacy title strongly suggests that production domain. Update `astro.config.mjs` if the canonical domain differs.
- The resume PDF does not list education dates or certifications. Those fields were left intentionally conservative to avoid inventing details.
- GitHub was linked from the repository remote at `https://github.com/rish742/rish742.github.io.git`.
- Astro was pinned to the v5 line so the project builds cleanly on the available Node 20 runtime in this environment.
