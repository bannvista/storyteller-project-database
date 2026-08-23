<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The public-facing side of the plugin: a marketing homepage and a
 * sandboxed demo, served at clean URLs independent of the active theme
 * (same full-takeover technique as the admin app, so it renders
 * consistently regardless of what theme the site is running).
 *
 * Deliberately NOT a real signup flow — the demo runs entirely on
 * client-side sample data (assets/js/demo-data.js), so visitors can
 * click around without a WordPress account and without ever touching
 * real site data. Real access stays admin-only via wp-login.php.
 */
class SPD_Public_Site {

	const BASE = 'storyteller-database';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_rewrites' ), 10 );
		add_action( 'init', array( __CLASS__, 'maybe_flush_rewrites' ), 20 );
		add_filter( 'query_vars', array( __CLASS__, 'add_query_var' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_render' ) );
	}

	public static function register_rewrites() {
		add_rewrite_rule( '^' . self::BASE . '/demo/?$', 'index.php?spd_page=demo', 'top' );
		add_rewrite_rule( '^' . self::BASE . '/?$', 'index.php?spd_page=home', 'top' );
	}

	/**
	 * Rules added inside the activation hook itself don't reliably survive
	 * flush_rewrite_rules() there — at that point in WordPress's plugin
	 * lifecycle, this plugin's own 'init' hook (which is what actually
	 * registers the rules above) hasn't necessarily run yet this request.
	 * Deferring the flush to the very next normal `init` — after
	 * register_rewrites() has run through the normal hook — is the
	 * reliable fix and is transparent to the user (it happens on the
	 * same redirect back to the plugins list after activating).
	 */
	public static function maybe_flush_rewrites() {
		if ( get_option( 'spd_needs_rewrite_flush' ) ) {
			flush_rewrite_rules();
			delete_option( 'spd_needs_rewrite_flush' );
		}
	}

	public static function schedule_flush() {
		update_option( 'spd_needs_rewrite_flush', 1 );
	}

	public static function add_query_var( $vars ) {
		$vars[] = 'spd_page';
		return $vars;
	}

	public static function home_url() {
		return home_url( '/' . self::BASE . '/' );
	}

	public static function demo_url() {
		return home_url( '/' . self::BASE . '/demo/' );
	}

	public static function maybe_render() {
		$page = get_query_var( 'spd_page' );
		if ( 'home' === $page ) {
			self::render_home();
			exit;
		}
		if ( 'demo' === $page ) {
			self::render_demo();
			exit;
		}
	}

	private static function demo_asset_tags() {
		return
			'<link rel="stylesheet" href="' . esc_url( SPD_PLUGIN_URL . 'assets/css/app.css' ) . '?v=' . SPD_VERSION . '">';
	}

	/**
	 * The homepage is a scroll-driven "Live Surface" page built with the
	 * scrollcraft engine (github.com/nateherkai/scroll-craft, MIT —
	 * vendored unmodified in assets/*​/scrollcraft-engine.*, see
	 * third-party-licenses/). The dashboard/database/beat-sheet content is
	 * the same labelled sample data as the sandboxed demo — never the real
	 * site owner's private records, since this page is public.
	 */
	public static function render_home() {
		$plans      = SPD_REST_API::plans_data();
		$demo_url   = self::demo_url();
		$signin_url = esc_url( wp_login_url() );

		header( 'Content-Type: text/html; charset=utf-8' );
		?>
		<!doctype html>
		<html lang="en">
		<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
		<title>Project Database · the story tool that already has your work in it</title>
		<meta name="description" content="A project, character, and franchise database for storytellers, with a beat sheet that builds itself as you scroll.">
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
		<link rel="stylesheet" href="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/css/scrollcraft-engine.css' ); ?>?v=<?php echo SPD_VERSION; ?>">
		<link rel="stylesheet" href="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/css/homepage-scroll.css' ); ?>?v=<?php echo SPD_VERSION; ?>">
		</head>
		<body>

		<span data-sc-progress></span>
		<div class="sc-grain" aria-hidden="true"></div>

		<header class="appbar">
			<div class="appbar__mark"><span>P</span> Project Database</div>
			<nav class="appbar__tabs">
				<a href="#dashboard">Dashboard</a>
				<a href="#databases">Databases</a>
				<a href="#beatsheet">Beat Sheet</a>
				<a href="#imports">Imports</a>
				<a href="#pricing">Pricing</a>
				<?php if ( shortcode_exists( 'nextend_social_login' ) ) : ?>
					<?php echo do_shortcode( '[nextend_social_login provider="google" redirect="' . esc_attr( admin_url() ) . '"]' ); ?>
				<?php else : ?>
					<a href="<?php echo $signin_url; ?>">Sign In</a>
				<?php endif; ?>
			</nav>
		</header>

		<main>

			<!-- ACT 1 · Recognition — the dashboard, already populated. pin + count -->
			<section id="dashboard" data-sc-act="pin" data-sc-span="2.2" data-sc-drift="#0b0b0d">
				<div data-sc-stage class="sc-wrap" style="flex-direction:column; align-items:flex-start; justify-content:center; gap:var(--sc-5);">
					<p class="sample-note" style="margin-bottom:var(--sc-3)">Live sample data, this is the real dashboard, seeded for the demo</p>
					<div class="sc-copy" data-sc-cue="0 0.7 0">
						<h1 class="sc-display sc-display--lg" style="margin:0 0 var(--sc-2)">Good morning. Your library is already here.</h1>
						<p class="sc-body">No empty state, no setup wizard: six projects, two franchises, four characters, already organized.</p>
					</div>
					<div class="stat-grid" data-sc-cue="0.1 0.85">
						<div class="surface-card"><div class="stat-label">Total Projects</div><div class="stat-value"><span data-sc-count="0 6" data-sc-count-at="0.15 0.55">0</span></div></div>
						<div class="surface-card"><div class="stat-label">Franchises</div><div class="stat-value"><span data-sc-count="0 2" data-sc-count-at="0.22 0.6">0</span></div></div>
						<div class="surface-card"><div class="stat-label">Characters</div><div class="stat-value"><span data-sc-count="0 4" data-sc-count-at="0.28 0.65">0</span></div></div>
						<div class="surface-card"><div class="stat-label">Complete</div><div class="stat-value"><span data-sc-count="0 1" data-sc-count-at="0.34 0.7">0</span></div></div>
					</div>
				</div>
			</section>

			<!-- ACT 2 · Substance — the databases are real, linked records. flow + in -->
			<section class="sc-section" data-sc-act="flow" data-sc-drift="#101115">
				<div class="sc-wrap">
					<div class="sc-stack" data-sc-in style="margin-bottom:var(--sc-8)">
						<h2 class="sc-display sc-display--md">Projects, franchises, and characters: actually linked.</h2>
						<p class="sc-body">Not three separate lists. A character points at a project, a project points at a franchise, and the franchise page shows every linked project back.</p>
					</div>
					<div class="db-row" data-sc-in data-sc-stagger="90">
						<div class="db-col">
							<h3>Projects</h3>
							<div class="db-item"><span class="name">Neon Requiem</span><span class="meta">Feature · Script · 78%</span></div>
							<div class="db-item" style="margin-top:14px"><span class="name">The Glass Meridian</span><span class="meta">TV Series · Pitch · 45%</span></div>
						</div>
						<div class="db-col">
							<h3>Franchises</h3>
							<div class="db-item"><span class="name">The Meridian Universe</span><span class="meta">Active · Thriller, Sci-Fi, Noir</span></div>
							<div class="db-item" style="margin-top:14px"><span class="name">Epoch Saga</span><span class="meta">Development · Sci-Fi, Fantasy</span></div>
						</div>
						<div class="db-col">
							<h3>Characters</h3>
							<div class="db-item"><span class="name">Detective Mara Voss</span><span class="meta">Protagonist · Neon Requiem</span></div>
							<div class="db-item" style="margin-top:14px"><span class="name">The Architect</span><span class="meta">Antagonist · The Glass Meridian</span></div>
						</div>
					</div>
				</div>
			</section>

			<!-- ACT 3 · Turn — THE PEAK. Beat sheet assembles live, driven by --sc-p. pin -->
			<section id="beatsheet" data-sc-act="pin" data-sc-span="3.4" data-sc-drift="#0e0e12">
				<div data-sc-stage class="sc-wrap" style="flex-direction:column; align-items:flex-start; justify-content:center;">
					<div class="beatsheet-panel">
						<p class="sample-note" style="margin-bottom:var(--sc-2)">The real generator, not a mockup</p>
						<div class="sc-copy" data-sc-cue="0 0.18 0">
							<h2 class="sc-display sc-display--md" style="margin:0 0 var(--sc-2)">Watch the beat sheet build itself.</h2>
						</div>
						<div class="beatsheet-head">
							<span class="pill pill--accent">Feature Film · Save the Cat</span>
							<span class="pill">110 pages</span>
						</div>
						<table class="beat-table" id="beatTable" aria-live="polite"></table>
					</div>
				</div>
			</section>

			<!-- ACT 4 · Range — imports/exports, the practical edges. pan + tilt -->
			<section id="imports" data-sc-act="pan" data-sc-span="2.4" data-sc-drift="#0b0b0d">
				<div data-sc-stage>
					<div class="rail" data-sc-pan="0.05" style="display:flex; align-items:center; gap:var(--sc-5); padding-inline:var(--sc-gutter);">
						<div class="rail__lead sc-stack" style="flex:0 0 260px;">
							<h2 class="sc-display sc-display--md">Every file finds its place.</h2>
							<p class="sc-body">Scripts, treatments, beat sheets, posters, research: imported once, attached to the right project.</p>
						</div>
						<article class="surface-card" data-sc-tilt="6"><div class="icon">📄</div><h3>Script</h3><p class="sc-body" style="font-size:var(--sc-t-sm)">.fdx, .pdf, .docx</p></article>
						<article class="surface-card" data-sc-tilt="6"><div class="icon">📋</div><h3>Treatment</h3><p class="sc-body" style="font-size:var(--sc-t-sm)">.docx, .pdf</p></article>
						<article class="surface-card" data-sc-tilt="6"><div class="icon">📊</div><h3>Beat Sheet</h3><p class="sc-body" style="font-size:var(--sc-t-sm)">.xlsx, .csv</p></article>
						<article class="surface-card" data-sc-tilt="6"><div class="icon">🎬</div><h3>Poster</h3><p class="sc-body" style="font-size:var(--sc-t-sm)">.jpg, .png, .svg</p></article>
						<article class="surface-card" data-sc-tilt="6"><div class="icon">📚</div><h3>Research</h3><p class="sc-body" style="font-size:var(--sc-t-sm)">.pdf, .docx</p></article>
					</div>
				</div>
			</section>

			<!-- ACT 5 · Commitment — real pricing (from SPD_REST_API::plans_data()),
			     then an actual input. LAST element on the page. pin -->
			<section id="pricing" data-sc-act="pin" data-sc-span="1.3" data-sc-drift="#08090a">
				<div data-sc-stage class="sc-wrap" style="flex-direction:column; align-items:flex-start; justify-content:center;">
					<div class="sc-copy" data-sc-cue="0.05" style="width:100%">
						<h2 class="sc-display sc-display--lg" style="margin:0 0 var(--sc-5)">Simple pricing. One action.</h2>
						<div class="price-row">
							<?php foreach ( $plans as $plan ) : ?>
								<div class="surface-card price-card"<?php echo 'pro' === $plan['id'] ? ' style="border-color: var(--sc-accent)"' : ''; ?>>
									<div class="stat-label"><?php echo esc_html( trim( explode( '—', $plan['name'] )[0] ) ); ?></div>
									<div class="price-amount">$<span data-sc-count="0 <?php echo (int) $plan['price']; ?>" data-sc-count-at="0.1 0.35">0</span><?php echo esc_html( $plan['period'] ); ?></div>
									<p class="sc-body" style="font-size:var(--sc-t-sm); margin-top:8px"><?php echo esc_html( implode( ', ', array_slice( $plan['features'], 0, 3 ) ) ); ?>.</p>
								</div>
							<?php endforeach; ?>
						</div>
						<form class="start-row" id="startForm">
							<input type="text" id="startTitle" placeholder="Type your next project's title…" aria-label="Your next project's title">
							<button type="submit" class="cta" data-sc-magnet="0.26" data-sc-rise="0">Start in the demo</button>
						</form>
					</div>
					<footer style="margin-top:var(--sc-8); font-size:var(--sc-t-xs); color:var(--sc-ink-soft)">Project Database for Storytellers</footer>
				</div>
			</section>

		</main>

		<script src="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/js/scrollcraft-engine.js' ); ?>?v=<?php echo SPD_VERSION; ?>"></script>
		<script>ScrollCraft.mount(document.body);</script>
		<script>window.SPD_DEMO_URL = <?php echo wp_json_encode( $demo_url ); ?>;</script>
		<script src="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/js/homepage-scroll.js' ); ?>?v=<?php echo SPD_VERSION; ?>"></script>
		</body>
		</html>
		<?php
	}

	public static function render_demo() {
		header( 'Content-Type: text/html; charset=utf-8' );
		?>
		<!doctype html>
		<html lang="en">
		<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Demo: Project Database</title>
		<?php echo self::demo_asset_tags(); ?>
		<style>
			.spd-demo-topbar { position: fixed; top: 0; left: 0; right: 0; height: 48px; background: #0e0e10; border-bottom: 1px solid #2a2a2e; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 10002; color: #f2f0ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; }
			.spd-demo-topbar a { color: #e3b077; text-decoration: none; font-weight: 600; }
			.spd-demo-topbar span { color: #9a9a9f; }
			#spd-app.spd-app { top: 48px; }
			html, body { background: #0b0b0d; margin: 0; }
		</style>
		</head>
		<body>
			<div class="spd-demo-topbar">
				<a href="<?php echo esc_url( self::home_url() ); ?>">← Back to homepage</a>
				<span>Demo mode (sample data only, nothing you do here is saved)</span>
			</div>
			<div id="spd-app" class="spd-app">Loading…</div>
			<script>
				window.SPD = {
					restUrl: 'https://demo.local/wp-json/storyteller/v1/',
					restNonce: 'demo',
					adminUrl: '<?php echo esc_js( self::home_url() ); ?>',
					exportNonce: 'demo',
					homeUrl: '<?php echo esc_js( self::home_url() ); ?>',
					userDisplayName: 'Jordan Mercer',
					backUrl: '<?php echo esc_js( self::home_url() ); ?>',
					backLabel: 'Back to homepage'
				};
			</script>
			<script src="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/js/demo-data.js' ); ?>?v=<?php echo SPD_VERSION; ?>"></script>
			<script src="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/js/app.js' ); ?>?v=<?php echo SPD_VERSION; ?>"></script>
		</body>
		</html>
		<?php
	}
}
