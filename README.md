# Storyteller Project Database

A WordPress plugin that turns your site into a private project/character/
franchise database for storytellers, with a beat sheet calculator, file
imports/exports, and a creator profile — matching the provided Figma design.

## Installing

1. Download `storyteller-project-database.zip` (built from this repo).
2. In WordPress admin: **Plugins → Add New → Upload Plugin**, choose the zip,
   click **Install Now**, then **Activate**.
   (Or unzip it into `wp-content/plugins/` via cPanel's File Manager / FTP,
   then activate from the Plugins screen.)
3. A new **Project Database** item appears in the WP admin sidebar — that's
   the whole app, full-screen.

Only logged-in users with the `manage_options` capability (i.e. site
administrators) can access it — there is no public-facing page or signup
flow, by design.

## What's real vs. display-only

- Projects, franchises, characters, the beat sheet calculator, and file
  imports/exports are fully functional and backed by WordPress's own
  database (custom post types + post meta) and media library.
- The **Billing** screen shows the plan/pricing UI from the design but does
  not process real payments — no Stripe or other billing integration is
  wired up.
- File imports store and attach the uploaded file for reference; they do
  not parse the contents of `.fdx` / `.docx` / `.pdf` files into structured
  data.
- **Export One-Sheet** renders a printable page from the project's own data
  (title, logline, genres, progress, beat sheet) — use your browser's
  print-to-PDF to save it as a file.

## Development

- `storyteller-project-database.php` — plugin bootstrap.
- `includes/class-post-types.php` — registers the Project/Character/Franchise
  custom post types and their meta fields.
- `includes/class-rest-api.php` — the `storyteller/v1` REST API the app talks to.
- `includes/class-beat-templates.php` — beat sheet templates and the
  page-scaling generator.
- `includes/class-exports.php` — the printable one-sheet export.
- `includes/class-admin-page.php` — registers the full-screen admin page and
  enqueues the front-end app.
- `assets/css/app.css`, `assets/js/app.js` — the app itself (vanilla JS,
  no build step required).
