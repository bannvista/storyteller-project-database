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
		add_action( 'login_enqueue_scripts', array( __CLASS__, 'login_styles' ) );
		add_filter( 'login_headerurl', array( __CLASS__, 'login_header_url' ) );
	}

	/**
	 * Restyles the stock wp-login.php to match the homepage's dark/amber
	 * theme instead of leaving Sign In dropping visitors onto the plain
	 * default WordPress screen. Pure CSS layered on top of core markup, so
	 * it can't break a WordPress update the way editing core files would.
	 */
	public static function login_styles() {
		echo '<link rel="stylesheet" href="' . esc_url( SPD_PLUGIN_URL . 'assets/css/login.css' ) . '?v=' . SPD_VERSION . '">';
	}

	public static function login_header_url() {
		return self::home_url();
	}

	public static function register_rewrites() {
		add_rewrite_rule( '^' . self::BASE . '/demo/?$', 'index.php?spd_page=demo', 'top' );
		add_rewrite_rule( '^' . self::BASE . '/signup/?$', 'index.php?spd_page=signup', 'top' );
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

	public static function signup_url() {
		return home_url( '/' . self::BASE . '/signup/' );
	}

	public static function maybe_render() {
		$page = get_query_var( 'spd_page' );
		if ( 'home' === $page ) {
			self::render_home();
			exit;
		}
		if ( 'signup' === $page ) {
			self::render_signup();
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

	private static function google_fonts_tag() {
		return '<link rel="preconnect" href="https://fonts.googleapis.com">' .
			'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' .
			'<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">';
	}

	private static function nav_signin_link( $signin_url ) {
		if ( shortcode_exists( 'nextend_social_login' ) ) {
			return do_shortcode( '[nextend_social_login provider="google" redirect="' . esc_attr( admin_url() ) . '"]' );
		}
		return '<a class="lp-btn lp-btn-ghost lp-btn-sm" href="' . esc_url( $signin_url ) . '">Sign In</a>';
	}

	/**
	 * A conventional static SaaS marketing page — matches the Figma Make
	 * source's Landing() component exactly (nav, hero, dashboard mockup
	 * preview, features grid, pricing preview, footer). The dashboard
	 * preview shows the same labelled sample data as the sandboxed demo —
	 * never the real site owner's private records, since this page is public.
	 */
	public static function render_home() {
		$plans      = SPD_REST_API::plans_data();
		$demo_url   = self::demo_url();
		$signup_url = self::signup_url();
		$signin_url = esc_url( wp_login_url() );

		header( 'Content-Type: text/html; charset=utf-8' );
		?>
		<!doctype html>
		<html lang="en">
		<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
		<title>Project Database — Your Creative Project Library. Organized.</title>
		<meta name="description" content="A project, character, and franchise database for storytellers, with a beat sheet calculator, file imports/exports, and a creator profile.">
		<?php echo self::google_fonts_tag(); ?>
		<link rel="stylesheet" href="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/css/homepage.css' ); ?>?v=<?php echo SPD_VERSION; ?>">
		</head>
		<body>

		<nav class="lp-nav">
			<div class="lp-mark"><div class="lp-mark-icon">🎬</div><div><div class="lp-mark-title">Project Database</div><div class="lp-mark-sub">for Storytellers</div></div></div>
			<div class="lp-navlinks">
				<a href="#lp-features">Features</a>
				<a href="<?php echo esc_url( $demo_url ); ?>">Demo</a>
				<a href="#lp-pricing">Pricing</a>
			</div>
			<div class="lp-nav-actions">
				<?php echo self::nav_signin_link( $signin_url ); ?>
				<a class="lp-btn lp-btn-primary lp-btn-sm" href="<?php echo esc_url( $signup_url ); ?>">Start Free</a>
			</div>
		</nav>

		<section class="lp-hero">
			<h1>Your Creative Project<br>Library. <em>Organized.</em></h1>
			<p class="lp-sub">Store loglines, build characters, track franchises, calculate beats, and develop every story from one professional workspace.</p>
			<div class="lp-cta-row">
				<a class="lp-btn lp-btn-primary lp-btn-lg" href="<?php echo esc_url( $signup_url ); ?>">Start Free →</a>
				<a class="lp-btn lp-btn-secondary lp-btn-lg" href="<?php echo esc_url( $demo_url ); ?>">View Demo</a>
			</div>
			<p class="lp-hero-note">No credit card required · Free forever plan available</p>
		</section>

		<div class="lp-mockup-wrap">
			<div class="lp-mockup">
				<div class="lp-mockup-bar">
					<span class="lp-mockup-dot" style="background:#FF5F57"></span>
					<span class="lp-mockup-dot" style="background:#FEBC2E"></span>
					<span class="lp-mockup-dot" style="background:#28C840"></span>
					<span class="lp-mockup-url">projectdatabase.app/dashboard</span>
				</div>
				<div class="lp-mockup-body">
					<div class="lp-mockup-sidebar">
						<div class="lp-mockup-nav-item active">▦ Dashboard</div>
						<div class="lp-mockup-nav-item">📁 Project Database</div>
						<div class="lp-mockup-nav-item">🔀 Franchise Database</div>
						<div class="lp-mockup-nav-item">👥 Character Database</div>
						<div class="lp-mockup-nav-item">📊 Beat Sheet Calculator</div>
					</div>
					<div class="lp-mockup-main">
						<div class="lp-mockup-toprow"><span>Good morning, Jordan.</span><span class="lp-mockup-newbtn">+ New Project</span></div>
						<div class="lp-mockup-stats">
							<div class="lp-mockup-stat"><div class="v">6</div><div class="l">Projects</div></div>
							<div class="lp-mockup-stat"><div class="v">2</div><div class="l">Franchises</div></div>
							<div class="lp-mockup-stat"><div class="v">4</div><div class="l">Characters</div></div>
							<div class="lp-mockup-stat"><div class="v">1</div><div class="l">Complete</div></div>
						</div>
						<div class="lp-mockup-row"><span class="icon">🎬</span><span class="name">Neon Requiem</span><span class="badge">Script</span></div>
						<div class="lp-mockup-row"><span class="icon">📺</span><span class="name">The Glass Meridian</span><span class="badge">Pitch</span></div>
						<div class="lp-mockup-row"><span class="icon">📖</span><span class="name">Ashwood</span><span class="badge">Outline</span></div>
					</div>
				</div>
			</div>
		</div>

		<section class="lp-section" id="lp-features">
			<div class="lp-section-inner">
				<p class="lp-eyebrow">Platform Features</p>
				<h2 class="lp-h2">Everything a storyteller needs,<br><em>in one place.</em></h2>
				<div class="lp-features-grid">
					<?php
					$features = array(
						array( '📁', 'Project Database', 'Centralize every film, series, novel, script, and concept in one organized library.' ),
						array( '🔀', 'Franchise Tracker', 'Build shared universes. Connect projects across IPs, timelines, and formats.' ),
						array( '👥', 'Character Database', 'Store arcs, traits, relationships, and motivations for every character you create.' ),
						array( '📊', 'Beat Sheet Calculator', 'Generate page-perfect beat sheets for features, pilots, shorts, and novels.' ),
						array( '⇩', 'Exportable One-Sheets', 'Generate investor-ready one-page project sheets in one click.' ),
						array( '✨', 'AI Story Assistant', 'Analyze your logline, refine your arc, and identify gaps with an AI creative partner.', true ),
					);
					foreach ( $features as $f ) :
						$soon = ! empty( $f[3] );
						?>
						<div class="lp-feature-card<?php echo $soon ? ' soon' : ''; ?>">
							<div class="lp-feature-icon"><?php echo $f[0]; ?></div>
							<div class="lp-feature-title-row"><h3><?php echo esc_html( $f[1] ); ?></h3><?php if ( $soon ) : ?><span class="lp-badge-soon">Soon</span><?php endif; ?></div>
							<p><?php echo esc_html( $f[2] ); ?></p>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>

		<section class="lp-section" id="lp-pricing">
			<div class="lp-section-inner">
				<p class="lp-eyebrow">Pricing</p>
				<h2 class="lp-h2">Fair pricing for every stage of your career.</h2>
				<p class="lp-section-sub">Start free. Upgrade when you're ready.</p>
				<div class="lp-pricing-grid">
					<?php foreach ( $plans as $plan ) : ?>
						<div class="lp-pricing-card<?php echo 'pro' === $plan['id'] ? ' highlight' : ''; ?>">
							<?php if ( 'pro' === $plan['id'] ) : ?><div class="lp-pricing-ribbon">Most Popular</div><?php endif; ?>
							<div class="lp-pricing-name"><?php echo esc_html( $plan['name'] ); ?></div>
							<div class="lp-pricing-amount"><span class="n">$<?php echo (int) $plan['price']; ?></span><?php if ( $plan['period'] ) : ?><span class="p"><?php echo esc_html( $plan['period'] ); ?></span><?php endif; ?></div>
							<hr class="lp-pricing-rule">
							<ul class="lp-pricing-features">
								<?php foreach ( array_slice( $plan['features'], 0, 5 ) as $f ) : ?>
									<li><?php echo esc_html( $f ); ?></li>
								<?php endforeach; ?>
							</ul>
							<a class="lp-btn <?php echo 'pro' === $plan['id'] ? 'lp-btn-primary' : 'lp-btn-outline'; ?> lp-btn-sm" style="width:100%;justify-content:center" href="<?php echo esc_url( $signup_url ); ?>">
								<?php echo 0 === (int) $plan['price'] ? 'Get Started' : 'Upgrade to ' . esc_html( $plan['name'] ); ?>
							</a>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</section>

		<footer class="lp-footer">
			<div class="lp-footer-inner">
				<div class="lp-footer-brand"><div class="lp-mark-icon">🎬</div>Banner Day Productions © <?php echo esc_html( gmdate( 'Y' ) ); ?></div>
				<div class="lp-footer-links"><span>Privacy</span><span>Terms</span><span>Contact</span></div>
			</div>
		</footer>

		</body>
		</html>
		<?php
	}

	/**
	 * Matches the Figma Make source's Signup() component: a two-column
	 * layout with sample-project social proof on the left, a profile-setup
	 * form on the right. This IS a real account-creation flow -- submitting
	 * calls the public storyteller/v1/signup REST route (SPD_REST_API::
	 * signup()), which creates a genuine WordPress account with its own
	 * private, isolated project database and logs the new user straight
	 * in. No password field: like most modern signup forms, WordPress
	 * generates one and emails the new user a link to set their own.
	 */
	public static function render_signup() {
		$home_url = self::home_url();
		$nonce    = wp_create_nonce( 'spd_signup' );

		header( 'Content-Type: text/html; charset=utf-8' );
		?>
		<!doctype html>
		<html lang="en">
		<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
		<title>Create your account — Project Database</title>
		<?php echo self::google_fonts_tag(); ?>
		<link rel="stylesheet" href="<?php echo esc_url( SPD_PLUGIN_URL . 'assets/css/homepage.css' ); ?>?v=<?php echo SPD_VERSION; ?>">
		</head>
		<body>
		<div class="su-wrap">
			<div class="su-left">
				<div class="lp-mark"><div class="lp-mark-icon">🎬</div><div class="lp-mark-title">Project Database</div></div>
				<div>
					<h2>Every great story<br>starts with one line.</h2>
					<p>Your creative command center awaits.</p>
					<div class="su-sample-card">
						<div class="top">🎬<span class="t">Neon Requiem</span><span class="spd-pill" style="font-size:9px;padding:3px 8px;border-radius:4px;background:rgba(120,53,15,0.4);color:#fcd34d">Script</span></div>
						<p>A retired detective in a rain-soaked neon city uncovers a conspiracy that threatens to erase the last traces of human memory from the digital grid.</p>
					</div>
					<div class="su-sample-card">
						<div class="top">📺<span class="t">The Glass Meridian</span><span class="spd-pill" style="font-size:9px;padding:3px 8px;border-radius:4px;background:rgba(124,45,18,0.4);color:#fdba74">Pitch</span></div>
						<p>Six strangers connected by a single photograph discover they are living parallel lives across different timelines — and one of them is the killer.</p>
					</div>
				</div>
				<p class="su-trust">Trusted by screenwriters, novelists, and filmmakers worldwide.</p>
			</div>
			<div class="su-right">
				<div class="su-form-wrap">
					<a class="su-back" href="<?php echo esc_url( $home_url ); ?>">‹ Back to home</a>
					<h2>Create your account</h2>
					<p>Set up your creative workspace in under a minute.</p>
					<form id="signupForm">
						<input type="text" name="website_url" id="su-honeypot" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" aria-hidden="true">
						<input type="hidden" id="su-nonce" value="<?php echo esc_attr( $nonce ); ?>">
						<input type="hidden" id="su-creative-type" value="Screenwriter">
						<div id="su-error" style="display:none;margin-bottom:16px;padding:10px 13px;border-radius:12px;background:rgba(212,24,61,0.1);border:1px solid rgba(212,24,61,0.3);color:#f87171;font-size:12.5px"></div>
						<div class="su-field-row">
							<div class="su-field"><label>Full Name</label><input type="text" id="su-name" placeholder="Jordan Mercer" required></div>
							<div class="su-field"><label>Email</label><input type="email" id="su-email" placeholder="jordan@studio.com" required></div>
						</div>
						<div class="su-field"><label>Production Company</label><input type="text" id="su-company" placeholder="Meridian Films Inc."></div>
						<div class="su-field"><label>Title / Role</label><input type="text" id="su-title" placeholder="Writer-Director"></div>
						<div class="su-field">
							<label>Primary Creative Type</label>
							<div class="su-chip-row">
								<?php foreach ( array( 'Screenwriter', 'Novelist', 'Filmmaker', 'Producer', 'Content Creator', 'Game Writer', 'Other' ) as $i => $type ) : ?>
									<button type="button" class="su-type-chip<?php echo 0 === $i ? ' active' : ''; ?>"><?php echo esc_html( $type ); ?></button>
								<?php endforeach; ?>
							</div>
						</div>
						<button type="submit" class="lp-btn lp-btn-primary lp-btn-lg" id="su-submit" style="width:100%;justify-content:center;margin-top:8px">Create Workspace →</button>
						<p class="su-footnote">Your own private workspace — nobody else can see it. <button type="button" id="su-signin-link">Already have an account? Sign in</button></p>
					</form>
				</div>
			</div>
		</div>
		<script>
			document.querySelectorAll( '.su-type-chip' ).forEach( function ( btn ) {
				btn.addEventListener( 'click', function () {
					document.querySelectorAll( '.su-type-chip' ).forEach( function ( b ) { b.classList.remove( 'active' ); } );
					btn.classList.add( 'active' );
					document.getElementById( 'su-creative-type' ).value = btn.textContent.trim();
				} );
			} );
			document.getElementById( 'su-signin-link' ).addEventListener( 'click', function () {
				window.location.href = <?php echo wp_json_encode( esc_url_raw( wp_login_url() ) ); ?>;
			} );
			document.getElementById( 'signupForm' ).addEventListener( 'submit', function ( e ) {
				e.preventDefault();
				var errBox = document.getElementById( 'su-error' );
				var submitBtn = document.getElementById( 'su-submit' );
				errBox.style.display = 'none';
				submitBtn.disabled = true;
				submitBtn.textContent = 'Creating your workspace…';

				fetch( <?php echo wp_json_encode( esc_url_raw( rest_url( 'storyteller/v1/signup' ) ) ); ?>, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'same-origin',
					body: JSON.stringify( {
						name: document.getElementById( 'su-name' ).value.trim(),
						email: document.getElementById( 'su-email' ).value.trim(),
						company: document.getElementById( 'su-company' ).value.trim(),
						title: document.getElementById( 'su-title' ).value.trim(),
						creative_type: document.getElementById( 'su-creative-type' ).value,
						website_url: document.getElementById( 'su-honeypot' ).value,
						_wpnonce: document.getElementById( 'su-nonce' ).value
					} )
				} ).then( function ( res ) {
					return res.json().then( function ( data ) { return { ok: res.ok, data: data }; } );
				} ).then( function ( result ) {
					if ( ! result.ok ) {
						throw new Error( result.data && result.data.message ? result.data.message : 'Something went wrong. Please try again.' );
					}
					window.location.href = result.data.redirect;
				} ).catch( function ( e ) {
					errBox.textContent = e.message;
					errBox.style.display = 'block';
					submitBtn.disabled = false;
					submitBtn.textContent = 'Create Workspace →';
				} );
			} );
		</script>
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
		<?php echo self::google_fonts_tag(); ?>
		<?php echo self::demo_asset_tags(); ?>
		<style>
			.spd-demo-topbar { position: fixed; top: 0; left: 0; right: 0; height: 48px; background: #0D0D12; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 10002; color: #F2F2F4; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; }
			.spd-demo-topbar a { color: #D4A96A; text-decoration: none; font-weight: 600; }
			.spd-demo-topbar span { color: #72727E; }
			#spd-app.spd-app { top: 48px; }
			html, body { background: #0B0B0F; margin: 0; }
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
