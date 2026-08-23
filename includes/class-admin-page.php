<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the single full-screen admin page the app lives on, and hides
 * the standard wp-admin chrome there so the app can render its own sidebar
 * and layout edge-to-edge, matching the design it was built from.
 */
class SPD_Admin_Page {

	const SLUG = 'storyteller-project-database';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	public static function register_menu() {
		add_menu_page(
			'Project Database',
			'Project Database',
			'manage_options',
			self::SLUG,
			array( __CLASS__, 'render' ),
			'dashicons-book-alt',
			3
		);
	}

	public static function enqueue( $hook ) {
		if ( strpos( $hook, self::SLUG ) === false ) {
			return;
		}

		wp_enqueue_style( 'spd-app', SPD_PLUGIN_URL . 'assets/css/app.css', array(), SPD_VERSION );
		wp_enqueue_script( 'spd-app', SPD_PLUGIN_URL . 'assets/js/app.js', array(), SPD_VERSION, true );

		wp_localize_script( 'spd-app', 'SPD', array(
			'restUrl'        => esc_url_raw( rest_url( SPD_REST_API::NS . '/' ) ),
			'restNonce'       => wp_create_nonce( 'wp_rest' ),
			'adminUrl'        => admin_url(),
			'exportNonce'     => wp_create_nonce( 'spd_export_onesheet' ),
			'homeUrl'         => home_url( '/' ),
			'userDisplayName' => wp_get_current_user()->display_name,
			'backUrl'         => admin_url(),
			'backLabel'       => 'Back to WP Admin',
		) );

		// Hide the standard wp-admin chrome on this page so the app can
		// render its own full-screen dark UI instead of living inside it.
		add_action( 'admin_head', function () {
			?>
			<style>
				html.wp-toolbar { padding-top: 0 !important; }
				#wpadminbar, #adminmenumain, #wpfooter, #screen-meta-links, .update-nag, .notice { display: none !important; }
				#wpcontent, #wpbody-content { margin-left: 0 !important; padding: 0 !important; }
				#wpbody { padding-top: 0 !important; }
				html, body { background: #0b0b0d !important; }
			</style>
			<?php
		} );
	}

	public static function render() {
		echo '<div id="spd-app" class="spd-app">Loading…</div>';
	}
}
