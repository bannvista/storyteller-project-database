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

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_types' ) );
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
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
				'spd_role'       => 'protagonist',
				'spd_project_id' => '',
				'spd_arc'        => '',
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
			self::CHARACTER => array( 'spd_traits' ),
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

	public static function auth_callback() {
		return current_user_can( 'manage_options' );
	}
}
