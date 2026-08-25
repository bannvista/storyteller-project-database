<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the three custom post types the app is built on, plus the
 * post meta each one exposes over the REST API.
 */
class SPD_Post_Types {

	const PROJECT   = 'spd_project';
	const CHARACTER = 'spd_character';
	const FRANCHISE = 'spd_franchise';

	/**
	 * The role self-registered customers get, and the capability that gates
	 * the app's admin page + REST API for anyone who isn't a full site
	 * administrator. Deliberately excludes edit_others_posts/delete_others_posts/
	 * read_private_posts -- a spd_creator can only ever touch their OWN posts
	 * of these types (WordPress's own map_meta_cap enforces this the same
	 * way for ANY code path, not just this plugin's REST routes).
	 */
	const ROLE = 'spd_creator';
	const CAP  = 'spd_use_app';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_types' ) );
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
	}

	/**
	 * Run once on activation. Site administrators already have every
	 * capability granted here (and keep full oversight of all customers'
	 * data via the REST API's manage_options bypass); this only needs to
	 * grant the app capability to them explicitly and create the low-
	 * privilege role that self-registered signups get.
	 */
	public static function register_role() {
		$admin = get_role( 'administrator' );
		if ( $admin && ! $admin->has_cap( self::CAP ) ) {
			$admin->add_cap( self::CAP );
		}

		if ( ! get_role( self::ROLE ) ) {
			add_role( self::ROLE, 'Storyteller Creator', array(
				'read'                   => true,
				'upload_files'           => true,
				'edit_posts'             => true,
				'edit_published_posts'   => true,
				'delete_posts'           => true,
				'delete_published_posts' => true,
				'publish_posts'          => true,
				self::CAP                => true,
			) );
		}
	}

	public static function register_post_types() {
		register_post_type( self::PROJECT, array(
			'label'        => 'Projects',
			'public'       => false,
			'show_ui'      => false,
			'show_in_rest' => true,
			'rest_base'    => 'spd-projects-raw',
			'supports'     => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap' => true,
		) );

		register_post_type( self::CHARACTER, array(
			'label'        => 'Characters',
			'public'       => false,
			'show_ui'      => false,
			'show_in_rest' => true,
			'rest_base'    => 'spd-characters-raw',
			'supports'     => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap' => true,
		) );

		register_post_type( self::FRANCHISE, array(
			'label'        => 'Franchises',
			'public'       => false,
			'show_ui'      => false,
			'show_in_rest' => true,
			'rest_base'    => 'spd-franchises-raw',
			'supports'     => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap' => true,
		) );
	}

	/**
	 * Every field the Figma screens show, stored as post meta. Registered
	 * with show_in_rest so the default post REST controller could read them
	 * too, though the app talks to the custom SPD_REST_API routes instead.
	 */
	public static function register_meta() {
		$string_fields = array(
			self::PROJECT => array(
				'spd_type'          => '',
				'spd_stage'         => 'idea',
				'spd_logline'       => '',
				'spd_synopsis'      => '',
				'spd_franchise_id'  => '',
				'spd_beat_template' => 'save_the_cat',
			),
			self::CHARACTER => array(
				'spd_role'        => 'protagonist',
				'spd_project_id'  => '',
				'spd_arc'         => '',
				'spd_archetype'   => '',
				'spd_personality' => '',
				'spd_motivation'  => '',
				'spd_strength'    => '',
				'spd_flaw'        => '',
				'spd_description' => '',
			),
			self::FRANCHISE => array(
				'spd_status' => 'development',
			),
		);

		foreach ( $string_fields as $post_type => $fields ) {
			foreach ( $fields as $key => $default ) {
				register_post_meta( $post_type, $key, array(
					'type'          => 'string',
					'single'        => true,
					'default'       => $default,
					'show_in_rest'  => true,
					'auth_callback' => array( __CLASS__, 'auth_callback' ),
				) );
			}
		}

		register_post_meta( self::PROJECT, 'spd_progress', array(
			'type'          => 'integer',
			'single'        => true,
			'default'       => 0,
			'show_in_rest'  => true,
			'auth_callback' => array( __CLASS__, 'auth_callback' ),
		) );

		register_post_meta( self::PROJECT, 'spd_total_pages', array(
			'type'          => 'integer',
			'single'        => true,
			'default'       => 100,
			'show_in_rest'  => true,
			'auth_callback' => array( __CLASS__, 'auth_callback' ),
		) );

		$array_fields = array(
			self::PROJECT   => array( 'spd_genres', 'spd_beats' ),
			self::CHARACTER => array( 'spd_traits', 'spd_relationships' ),
			self::FRANCHISE => array( 'spd_genres' ),
		);

		foreach ( $array_fields as $post_type => $keys ) {
			foreach ( $keys as $key ) {
				register_post_meta( $post_type, $key, array(
					'type'          => 'string',
					'single'        => true,
					'default'       => '[]',
					'show_in_rest'  => true,
					'auth_callback' => array( __CLASS__, 'auth_callback' ),
				) );
			}
		}
	}

	/**
	 * Gates the default WP REST post-meta controller (this app's own
	 * screens talk to SPD_REST_API's custom routes instead, which enforce
	 * ownership separately) -- site admins can read/write any customer's
	 * meta, and everyone else only their own post's meta.
	 */
	public static function auth_callback( $allowed, $meta_key, $post_id ) {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}
		$post = get_post( $post_id );
		return $post && (int) $post->post_author === get_current_user_id();
	}
}
