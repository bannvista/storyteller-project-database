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

A public marketing homepage lives at `yoursite.com/storyteller-database/`,
with a sandboxed demo (sample data, nothing saved) at
`yoursite.com/storyteller-database/demo/`. Both work regardless of your
active theme.

The homepage is a scroll-driven page built with the
[scrollcraft](https://github.com/nateherkai/scroll-craft) engine (MIT —
vendored unmodified as `assets/*/scrollcraft-engine.*`; see
`third-party-licenses/`): the dashboard stats count up, the databases
section reveals real linked records, and the Beat Sheet Calculator section
assembles its table row by row as you scroll, computed live from the same
Save-the-Cat math the real calculator uses. All of it is the same labelled
sample data as the `/demo/` page — never your real private projects, since
this page is public. Typing a title into the "Start in the demo" field on
the pricing section carries it straight into the demo's New Project form.

If the rewrite rules don't resolve right after activating
(a 404 on those URLs), go to **Settings → Permalinks** and click **Save
Changes** once — that forces WordPress to re-flush its rewrite rules.

## Signing in with Google

The homepage's "Sign In" button becomes a "Sign in with Google" button
automatically once you install and configure a social-login plugin — this
plugin doesn't implement Google OAuth itself (authentication is
security-sensitive, so it defers to a widely-used, actively maintained
plugin rather than reinventing it):

1. **Install [Nextend Social Login](https://wordpress.org/plugins/nextend-facebook-connect/)**
   (free): Plugins → Add New → search "Nextend Social Login" → Install →
   Activate.
2. **Create Google OAuth credentials** at
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create a project (or use an existing one).
   - Configure the "OAuth consent screen" (External is fine for a
     single-user site; you don't need to submit it for verification).
   - Create an **OAuth client ID** of type **Web application**.
   - Nextend's settings page (Settings → Nextend Social Login → Google)
     shows you the exact **Authorized redirect URI** to paste into the
     Google Cloud credential — copy it from there rather than guessing.
   - Copy the resulting **Client ID** and **Client Secret** into Nextend's
     Google settings.
3. **Keep this single-user**: by default Nextend can let anyone with a
   Google account register a brand-new WordPress account. Since this site
   is meant for just you, go to Nextend's settings and either disable new
   user registration via social login (only allow linking to an existing
   account) or, right after setting it up, log in once with your own
   Google account while already logged into WordPress to link the two —
   then double check Settings → General → Membership → "Anyone can
   register" is unchecked so no one else can create an account this way.

Once configured, the Google button appears both on this homepage and on
the normal `wp-login.php` screen automatically — nothing else to wire up.

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
