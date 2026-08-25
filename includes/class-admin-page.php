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
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ), 10 );
		add_action( 'admin_menu', array( __CLASS__, 'trim_menu_for_creators' ), 999 );
		add_action( 'admin_init', array( __CLASS__, 'redirect_creators_to_app' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/** A signed-up customer, not a full site administrator with the run of wp-admin. */
	private static function is_creator_only() {
		return ! current_user_can( 'manage_options' ) && current_user_can( SPD_Post_Types::CAP );
	}

	public static function register_menu() {
		add_menu_page(
			'Project Database',
			'Project Database',
			SPD_Post_Types::CAP,
			self::SLUG,
			array( __CLASS__, 'render' ),
			'dashicons-book-alt',
			3
		);
	}

	/**
	 * A customer's account exists for exactly one reason: this app. The
	 * standard WP dashboard, Posts, Comments, and Tools menus are noise
	 * left over from being a WordPress user underneath -- hidden for
	 * anyone who isn't a full site administrator. Media stays, since
	 * uploaded imports still live in the media library.
	 */
	public static function trim_menu_for_creators() {
		if ( ! self::is_creator_only() ) {
			return;
		}
		remove_menu_page( 'edit.php' );
		remove_menu_page( 'edit-comments.php' );
		remove_menu_page( 'tools.php' );
	}

	/** A customer landing on the bare WP dashboard belongs in the app instead. */
	public static function redirect_creators_to_app() {
		global $pagenow;
		if ( self::is_creator_only() && 'index.php' === $pagenow && empty( $_GET['page'] ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG ) );
			exit;
		}
	}

	public static function enqueue( $hook ) {
		if ( strpos( $hook, self::SLUG ) === false ) {
			return;
		}

		wp_enqueue_style( 'spd-fonts', 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap', array(), null );
		wp_enqueue_style( 'spd-app', SPD_PLUGIN_URL . 'assets/css/app.css', array( 'spd-fonts' ), SPD_VERSION );
		wp_enqueue_script( 'spd-app', SPD_PLUGIN_URL . 'assets/js/app.js', array(), SPD_VERSION, true );

		// A customer's wp-admin dashboard just redirects straight back here
		// (see redirect_creators_to_app()), so a "Back to WP Admin" link
		// for them would be a pointless bounce -- only site admins, whose
		// dashboard is a real destination, get the link.
		$is_creator = self::is_creator_only();
		wp_localize_script( 'spd-app', 'SPD', array(
			'restUrl'        => esc_url_raw( rest_url( SPD_REST_API::NS . '/' ) ),
			'restNonce'       => wp_create_nonce( 'wp_rest' ),
			'adminUrl'        => admin_url(),
			'exportNonce'     => wp_create_nonce( 'spd_export_onesheet' ),
			'homeUrl'         => home_url( '/' ),
			'userDisplayName' => wp_get_current_user()->display_name,
			'backUrl'         => $is_creator ? '' : admin_url(),
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
				html, body { background: #0B0B0F !important; }
			</style>
			<?php
		} );
	}

	public static function render() {
		echo '<div id="spd-app" class="spd-app">Loading…</div>';
	}
}
