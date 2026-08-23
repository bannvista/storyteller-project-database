<?php
/**
 * Plugin Name: Storyteller Project Database
 * Description: Project, character, and franchise database for storytellers, with a beat sheet calculator, file imports/exports, and creator profile.
 * Version: 1.0.0
 * Author: Jordan Mercer
 * Text Domain: storyteller-project-database
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SPD_VERSION', '1.0.0' );
define( 'SPD_PLUGIN_FILE', __FILE__ );
define( 'SPD_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SPD_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once SPD_PLUGIN_DIR . 'includes/class-post-types.php';
require_once SPD_PLUGIN_DIR . 'includes/class-beat-templates.php';
require_once SPD_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once SPD_PLUGIN_DIR . 'includes/class-exports.php';
require_once SPD_PLUGIN_DIR . 'includes/class-admin-page.php';
require_once SPD_PLUGIN_DIR . 'includes/class-public-site.php';

/**
 * Boots the plugin's pieces. Order matters only for the CPT registration
 * needing to run before rewrite rules are flushed on activation.
 */
final class Storyteller_Project_Database {

	public static function init() {
		SPD_Post_Types::init();
		SPD_REST_API::init();
		SPD_Exports::init();
		SPD_Admin_Page::init();
		SPD_Public_Site::init();
	}
}

add_action( 'plugins_loaded', array( 'Storyteller_Project_Database', 'init' ) );

register_activation_hook( __FILE__, function () {
	SPD_Post_Types::register_post_types();
	SPD_Public_Site::register_rewrites();
	flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, function () {
	flush_rewrite_rules();
} );
