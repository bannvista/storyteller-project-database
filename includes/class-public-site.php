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
		add_action( 'init', array( __CLASS__, 'register_rewrites' ) );
		add_filter( 'query_vars', array( __CLASS__, 'add_query_var' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_render' ) );
	}

	public static function register_rewrites() {
		add_rewrite_rule( '^' . self::BASE . '/demo/?$', 'index.php?spd_page=demo', 'top' );
		add_rewrite_rule( '^' . self::BASE . '/?$', 'index.php?spd_page=home', 'top' );
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

	private static function asset_tags() {
		return
			'<link rel="stylesheet" href="' . esc_url( SPD_PLUGIN_URL . 'assets/css/app.css' ) . '?v=' . SPD_VERSION . '">' .
			'<link rel="stylesheet" href="' . esc_url( SPD_PLUGIN_URL . 'assets/css/homepage.css' ) . '?v=' . SPD_VERSION . '">';
	}

	public static function render_home() {
		$plans      = SPD_REST_API::plans_data();
		$demo_url   = esc_url( self::demo_url() );
		$signin_url = esc_url( wp_login_url() );

		header( 'Content-Type: text/html; charset=utf-8' );
		?>
		<!doctype html>
		<html lang="en">
		<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Project Database — for Storytellers</title>
		<?php echo self::asset_tags(); ?>
		</head>
		<body class="spd-home-body">
			<div class="spd-home">
				<header class="spd-home-header">
					<div class="spd-home-brand"><span class="spd-home-brand-icon">🎬</span> Project Database</div>
					<nav class="spd-home-nav">
						<a href="<?php echo $demo_url; ?>" class="spd-btn">Try the Demo</a>
						<a href="<?php echo $signin_url; ?>" class="spd-btn spd-btn-primary">Sign In</a>
					</nav>
				</header>

				<section class="spd-hero">
					<h1>Your entire story world, in one place.</h1>
					<p class="spd-hero-sub">Projects, characters, franchises, and beat sheets — organized like a writers' room, not a spreadsheet.</p>
					<div class="spd-hero-actions">
						<a href="<?php echo $demo_url; ?>" class="spd-btn spd-btn-primary spd-btn-lg">Try the Demo — no account needed</a>
					</div>
				</section>

				<section class="spd-features">
					<div class="spd-feature"><div class="spd-feature-icon">📁</div><h3>Project Database</h3><p>Track every script, pitch, and outline with progress, genre, and stage in one dashboard.</p></div>
					<div class="spd-feature"><div class="spd-feature-icon">🔀</div><h3>Franchise Database</h3><p>Group related projects into shared universes and see the whole IP ecosystem at a glance.</p></div>
					<div class="spd-feature"><div class="spd-feature-icon">👥</div><h3>Character Database</h3><p>Keep protagonists, antagonists, and supporting casts organized across every project.</p></div>
					<div class="spd-feature"><div class="spd-feature-icon">📊</div><h3>Beat Sheet Calculator</h3><p>Generate structure-perfect beat sheets — Save the Cat, three-act, or teleplay — scaled to any page count.</p></div>
					<div class="spd-feature"><div class="spd-feature-icon">⇵</div><h3>Imports &amp; Exports</h3><p>Bring in scripts, treatments, and posters, and export a polished one-sheet for any project.</p></div>
				</section>

				<section class="spd-pricing">
					<h2>Simple pricing</h2>
					<div class="spd-pricing-grid">
						<?php foreach ( $plans as $plan ) : ?>
							<div class="spd-price-card<?php echo 'pro' === $plan['id'] ? ' spd-price-card-highlight' : ''; ?>">
								<div class="spd-price-name"><?php echo esc_html( $plan['name'] ); ?></div>
								<div class="spd-price-amount">$<?php echo (int) $plan['price']; ?><span><?php echo esc_html( $plan['period'] ); ?></span></div>
								<ul class="spd-price-features">
									<?php foreach ( $plan['features'] as $f ) : ?>
										<li><?php echo esc_html( $f ); ?></li>
									<?php endforeach; ?>
								</ul>
							</div>
						<?php endforeach; ?>
					</div>
				</section>

				<footer class="spd-home-footer">Project Database for Storytellers</footer>
			</div>
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
		<title>Demo — Project Database</title>
		<?php echo self::asset_tags(); ?>
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
				<span>Demo mode — sample data only, nothing you do here is saved</span>
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
