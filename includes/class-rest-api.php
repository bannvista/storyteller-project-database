<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Custom REST routes under storyteller/v1. Everything is gated to
 * manage_options since this is a single-user tool (the site owner) — there
 * is no multi-user access model to enforce here.
 */
class SPD_REST_API {

	const NS = 'storyteller/v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function can_manage() {
		return current_user_can( 'manage_options' );
	}

	public static function register_routes() {
		$perm = array( __CLASS__, 'can_manage' );

		register_rest_route( self::NS, '/dashboard', array(
			'methods' => 'GET', 'callback' => array( __CLASS__, 'get_dashboard' ), 'permission_callback' => $perm,
		) );

		self::register_crud( 'projects', SPD_Post_Types::PROJECT, array( __CLASS__, 'serialize_project' ), array( __CLASS__, 'save_project' ) );
		self::register_crud( 'franchises', SPD_Post_Types::FRANCHISE, array( __CLASS__, 'serialize_franchise' ), array( __CLASS__, 'save_franchise' ) );
		self::register_crud( 'characters', SPD_Post_Types::CHARACTER, array( __CLASS__, 'serialize_character' ), array( __CLASS__, 'save_character' ) );

		register_rest_route( self::NS, '/projects/(?P<id>\d+)/beatsheet', array(
			array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_beatsheet' ), 'permission_callback' => $perm ),
			array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'generate_beatsheet' ), 'permission_callback' => $perm ),
		) );

		register_rest_route( self::NS, '/beat-templates', array(
			'methods' => 'GET', 'permission_callback' => $perm,
			'callback' => function () {
				$out = array();
				foreach ( SPD_Beat_Templates::templates() as $key => $t ) {
					$out[] = array( 'key' => $key, 'label' => $t['label'] );
				}
				return rest_ensure_response( $out );
			},
		) );

		register_rest_route( self::NS, '/projects/(?P<id>\d+)/imports', array(
			array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_imports' ), 'permission_callback' => $perm ),
			array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'upload_import' ), 'permission_callback' => $perm ),
		) );

		register_rest_route( self::NS, '/imports/(?P<id>\d+)', array(
			'methods' => 'DELETE', 'callback' => array( __CLASS__, 'delete_import' ), 'permission_callback' => $perm,
		) );

		register_rest_route( self::NS, '/profile', array(
			array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_profile' ), 'permission_callback' => $perm ),
			array( 'methods' => 'PUT', 'callback' => array( __CLASS__, 'save_profile' ), 'permission_callback' => $perm ),
		) );

		register_rest_route( self::NS, '/billing', array(
			'methods' => 'GET', 'callback' => array( __CLASS__, 'get_billing' ), 'permission_callback' => $perm,
		) );
	}

	/* ---------------------------------------------------------------- */
	/* Generic CRUD registration                                        */
	/* ---------------------------------------------------------------- */

	private static function register_crud( $base, $post_type, $serializer, $saver ) {
		$perm = array( __CLASS__, 'can_manage' );

		register_rest_route( self::NS, "/$base", array(
			array(
				'methods'             => 'GET',
				'permission_callback' => $perm,
				'callback'            => function ( $request ) use ( $post_type, $serializer ) {
					$posts = get_posts( array(
						'post_type'      => $post_type,
						'post_status'    => 'publish',
						'posts_per_page' => -1,
						'orderby'        => 'date',
						'order'          => 'DESC',
					) );
					return rest_ensure_response( array_map( $serializer, $posts ) );
				},
			),
			array(
				'methods'             => 'POST',
				'permission_callback' => $perm,
				'callback'            => function ( $request ) use ( $post_type, $serializer, $saver ) {
					$id = wp_insert_post( array(
						'post_type'   => $post_type,
						'post_status' => 'publish',
						'post_title'  => sanitize_text_field( $request->get_param( 'title' ) ?: 'Untitled' ),
					), true );
					if ( is_wp_error( $id ) ) {
						return $id;
					}
					call_user_func( $saver, $id, $request );
					return rest_ensure_response( call_user_func( $serializer, get_post( $id ) ) );
				},
			),
		) );

		register_rest_route( self::NS, "/$base/(?P<id>\\d+)", array(
			array(
				'methods'             => 'GET',
				'permission_callback' => $perm,
				'callback'            => function ( $request ) use ( $post_type, $serializer ) {
					$post = self::get_post_of_type( $request['id'], $post_type );
					if ( ! $post ) {
						return new WP_Error( 'spd_not_found', 'Not found.', array( 'status' => 404 ) );
					}
					return rest_ensure_response( call_user_func( $serializer, $post ) );
				},
			),
			array(
				'methods'             => 'PUT',
				'permission_callback' => $perm,
				'callback'            => function ( $request ) use ( $post_type, $serializer, $saver ) {
					$post = self::get_post_of_type( $request['id'], $post_type );
					if ( ! $post ) {
						return new WP_Error( 'spd_not_found', 'Not found.', array( 'status' => 404 ) );
					}
					if ( null !== $request->get_param( 'title' ) ) {
						wp_update_post( array( 'ID' => $post->ID, 'post_title' => sanitize_text_field( $request->get_param( 'title' ) ) ) );
					}
					call_user_func( $saver, $post->ID, $request );
					return rest_ensure_response( call_user_func( $serializer, get_post( $post->ID ) ) );
				},
			),
			array(
				'methods'             => 'DELETE',
				'permission_callback' => $perm,
				'callback'            => function ( $request ) use ( $post_type ) {
					$post = self::get_post_of_type( $request['id'], $post_type );
					if ( ! $post ) {
						return new WP_Error( 'spd_not_found', 'Not found.', array( 'status' => 404 ) );
					}
					wp_delete_post( $post->ID, true );
					return rest_ensure_response( array( 'deleted' => true ) );
				},
			),
		) );
	}

	private static function get_post_of_type( $id, $post_type ) {
		$post = get_post( (int) $id );
		if ( ! $post || $post->post_type !== $post_type ) {
			return null;
		}
		return $post;
	}

	/* ---------------------------------------------------------------- */
	/* Meta helpers                                                      */
	/* ---------------------------------------------------------------- */

	private static function meta_json_get( $post_id, $key ) {
		$raw = get_post_meta( $post_id, $key, true );
		$val = json_decode( $raw, true );
		return is_array( $val ) ? $val : array();
	}

	private static function meta_json_set( $post_id, $key, $value ) {
		$value = is_array( $value ) ? $value : array();
		update_post_meta( $post_id, $key, wp_json_encode( array_values( array_map( 'sanitize_text_field', $value ) ) ) );
	}

	/**
	 * Same as meta_json_get/set but for arrays of associative objects
	 * (relationships, experience, awards) rather than flat string lists --
	 * each item's values still go through sanitize_text_field individually.
	 */
	private static function meta_json_object_list_set( $post_id, $key, $value ) {
		$value = is_array( $value ) ? $value : array();
		$clean = array_values( array_map( function ( $row ) {
			return is_array( $row ) ? array_map( 'sanitize_text_field', $row ) : array();
		}, $value ) );
		update_post_meta( $post_id, $key, wp_json_encode( $clean ) );
	}

	private static function str_param( $request, $key, $default = '' ) {
		$val = $request->get_param( $key );
		return null === $val ? $default : sanitize_text_field( $val );
	}

	private static function text_param( $request, $key, $default = '' ) {
		$val = $request->get_param( $key );
		return null === $val ? $default : sanitize_textarea_field( $val );
	}

	/**
	 * Writes a meta value only when the request actually included that
	 * field, so a partial PUT (e.g. linking a franchise from the
	 * Projects list) never silently resets fields the request didn't
	 * touch back to a hardcoded default.
	 */
	private static function maybe_update_meta( $id, $request, $key, $meta_key, $sanitizer = null ) {
		$val = $request->get_param( $key );
		if ( null === $val ) {
			return;
		}
		if ( $sanitizer ) {
			$val = call_user_func( $sanitizer, $val );
		}
		update_post_meta( $id, $meta_key, $val );
	}

	/* ---------------------------------------------------------------- */
	/* Projects                                                          */
	/* ---------------------------------------------------------------- */

	public static function serialize_project( $post ) {
		return array(
			'id'             => $post->ID,
			'title'          => get_the_title( $post ),
			'type'           => get_post_meta( $post->ID, 'spd_type', true ),
			'stage'          => get_post_meta( $post->ID, 'spd_stage', true ),
			'logline'        => get_post_meta( $post->ID, 'spd_logline', true ),
			'synopsis'       => get_post_meta( $post->ID, 'spd_synopsis', true ),
			'progress'       => (int) get_post_meta( $post->ID, 'spd_progress', true ),
			'genres'         => self::meta_json_get( $post->ID, 'spd_genres' ),
			'franchise_id'   => (int) get_post_meta( $post->ID, 'spd_franchise_id', true ),
			'total_pages'    => (int) ( get_post_meta( $post->ID, 'spd_total_pages', true ) ?: 100 ),
			'beat_template'  => get_post_meta( $post->ID, 'spd_beat_template', true ) ?: 'save_the_cat',
			'date'           => get_the_date( 'Y-m-d', $post ),
		);
	}

	public static function save_project( $id, $request ) {
		self::maybe_update_meta( $id, $request, 'type', 'spd_type', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'stage', 'spd_stage', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'logline', 'spd_logline', 'sanitize_textarea_field' );
		self::maybe_update_meta( $id, $request, 'synopsis', 'spd_synopsis', 'sanitize_textarea_field' );
		self::maybe_update_meta( $id, $request, 'progress', 'spd_progress', function ( $v ) { return max( 0, min( 100, (int) $v ) ); } );
		self::maybe_update_meta( $id, $request, 'franchise_id', 'spd_franchise_id', 'intval' );
		self::maybe_update_meta( $id, $request, 'total_pages', 'spd_total_pages', function ( $v ) { return max( 1, (int) $v ); } );
		self::maybe_update_meta( $id, $request, 'beat_template', 'spd_beat_template', 'sanitize_text_field' );
		if ( null !== $request->get_param( 'genres' ) ) {
			self::meta_json_set( $id, 'spd_genres', (array) $request->get_param( 'genres' ) );
		}
	}

	/* ---------------------------------------------------------------- */
	/* Franchises                                                        */
	/* ---------------------------------------------------------------- */

	public static function serialize_franchise( $post ) {
		$linked = get_posts( array(
			'post_type'      => SPD_Post_Types::PROJECT,
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'meta_key'       => 'spd_franchise_id',
			'meta_value'     => $post->ID,
		) );

		return array(
			'id'          => $post->ID,
			'title'       => get_the_title( $post ),
			'description' => get_post_meta( $post->ID, 'spd_synopsis_or_description', true ) ?: get_post_field( 'post_content', $post->ID ),
			'status'      => get_post_meta( $post->ID, 'spd_status', true ) ?: 'development',
			'genres'      => self::meta_json_get( $post->ID, 'spd_genres' ),
			'projects'    => array_map( function ( $p ) {
				return array(
					'id'    => $p->ID,
					'title' => get_the_title( $p ),
					'stage' => get_post_meta( $p->ID, 'spd_stage', true ),
					'type'  => get_post_meta( $p->ID, 'spd_type', true ),
				);
			}, $linked ),
		);
	}

	public static function save_franchise( $id, $request ) {
		self::maybe_update_meta( $id, $request, 'status', 'spd_status', 'sanitize_text_field' );
		if ( null !== $request->get_param( 'description' ) ) {
			wp_update_post( array( 'ID' => $id, 'post_content' => self::text_param( $request, 'description' ) ) );
		}
		if ( null !== $request->get_param( 'genres' ) ) {
			self::meta_json_set( $id, 'spd_genres', (array) $request->get_param( 'genres' ) );
		}
	}

	/* ---------------------------------------------------------------- */
	/* Characters                                                        */
	/* ---------------------------------------------------------------- */

	public static function serialize_character( $post ) {
		$project_id = (int) get_post_meta( $post->ID, 'spd_project_id', true );
		return array(
			'id'           => $post->ID,
			'name'         => get_the_title( $post ),
			'role'         => get_post_meta( $post->ID, 'spd_role', true ) ?: 'protagonist',
			'project_id'   => $project_id,
			'project_name' => $project_id ? get_the_title( $project_id ) : '',
			'arc'          => get_post_meta( $post->ID, 'spd_arc', true ),
			'traits'       => self::meta_json_get( $post->ID, 'spd_traits' ),
			'archetype'    => get_post_meta( $post->ID, 'spd_archetype', true ),
			'personality'  => get_post_meta( $post->ID, 'spd_personality', true ),
			'motivation'   => get_post_meta( $post->ID, 'spd_motivation', true ),
			'strength'     => get_post_meta( $post->ID, 'spd_strength', true ),
			'flaw'         => get_post_meta( $post->ID, 'spd_flaw', true ),
			'description'  => get_post_meta( $post->ID, 'spd_description', true ),
			'relationships'=> self::meta_json_get( $post->ID, 'spd_relationships' ),
		);
	}

	public static function save_character( $id, $request ) {
		self::maybe_update_meta( $id, $request, 'role', 'spd_role', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'project_id', 'spd_project_id', 'intval' );
		self::maybe_update_meta( $id, $request, 'arc', 'spd_arc', 'sanitize_textarea_field' );
		self::maybe_update_meta( $id, $request, 'archetype', 'spd_archetype', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'personality', 'spd_personality', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'motivation', 'spd_motivation', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'strength', 'spd_strength', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'flaw', 'spd_flaw', 'sanitize_text_field' );
		self::maybe_update_meta( $id, $request, 'description', 'spd_description', 'sanitize_textarea_field' );
		if ( null !== $request->get_param( 'traits' ) ) {
			self::meta_json_set( $id, 'spd_traits', (array) $request->get_param( 'traits' ) );
		}
		if ( null !== $request->get_param( 'relationships' ) ) {
			self::meta_json_object_list_set( $id, 'spd_relationships', (array) $request->get_param( 'relationships' ) );
		}
	}

	/* ---------------------------------------------------------------- */
	/* Dashboard                                                         */
	/* ---------------------------------------------------------------- */

	public static function get_dashboard() {
		$projects = get_posts( array( 'post_type' => SPD_Post_Types::PROJECT, 'post_status' => 'publish', 'posts_per_page' => -1 ) );

		$genre_counts = array();
		$type_counts  = array();
		$complete     = 0;

		foreach ( $projects as $p ) {
			if ( get_post_meta( $p->ID, 'spd_stage', true ) === 'complete' ) {
				$complete++;
			}
			foreach ( self::meta_json_get( $p->ID, 'spd_genres' ) as $g ) {
				$genre_counts[ $g ] = ( $genre_counts[ $g ] ?? 0 ) + 1;
			}
			$type = get_post_meta( $p->ID, 'spd_type', true ) ?: 'unspecified';
			$type_counts[ $type ] = ( $type_counts[ $type ] ?? 0 ) + 1;
		}

		$franchise_count = wp_count_posts( SPD_Post_Types::FRANCHISE )->publish ?? 0;
		$character_count = wp_count_posts( SPD_Post_Types::CHARACTER )->publish ?? 0;
		$total           = count( $projects );

		/**
		 * Normalizes each distribution against the SUM OF ITS OWN counts, not
		 * against the project total. A project can carry more than one genre
		 * (unlike type, which is exactly one per project), so genre counts
		 * summed against the project total routinely exceed 100% -- e.g. two
		 * genres tagged on every project would total 200%. Fed straight into
		 * a conic-gradient/pie, stops past 100% wrap back over the start of
		 * the circle, which is what caused two of the donut's polar-position
		 * labels to render on top of each other instead of at genuinely
		 * distinct angles. Normalizing per-distribution keeps every pie's
		 * own slices summing to exactly 100%, whatever it's a distribution of.
		 */
		$to_distribution = function ( $counts ) {
			$sum = array_sum( $counts );
			$out = array();
			foreach ( $counts as $label => $count ) {
				$out[] = array(
					'label'   => $label,
					'count'   => $count,
					'percent' => $sum ? round( ( $count / $sum ) * 100 ) : 0,
				);
			}
			usort( $out, function ( $a, $b ) { return $b['count'] <=> $a['count']; } );
			return $out;
		};

		return rest_ensure_response( array(
			'creator_name'       => self::get_profile_data()['name'] ?: get_bloginfo( 'name' ),
			'total_projects'     => $total,
			'franchises'         => (int) $franchise_count,
			'characters'         => (int) $character_count,
			'complete'           => $complete,
			'genre_distribution' => $to_distribution( $genre_counts ),
			'type_distribution'  => $to_distribution( $type_counts ),
		) );
	}

	/* ---------------------------------------------------------------- */
	/* Beat sheet                                                        */
	/* ---------------------------------------------------------------- */

	public static function get_beatsheet( $request ) {
		$id = (int) $request['id'];
		return rest_ensure_response( array(
			'template'    => get_post_meta( $id, 'spd_beat_template', true ) ?: 'save_the_cat',
			'total_pages' => (int) ( get_post_meta( $id, 'spd_total_pages', true ) ?: 100 ),
			'beats'       => self::meta_json_get( $id, 'spd_beats' ),
		) );
	}

	public static function generate_beatsheet( $request ) {
		$id          = (int) $request['id'];
		$template    = self::str_param( $request, 'template', 'save_the_cat' );
		$total_pages = max( 1, (int) $request->get_param( 'total_pages' ) ?: 100 );

		$beats = SPD_Beat_Templates::generate( $template, $total_pages );
		if ( is_wp_error( $beats ) ) {
			return $beats;
		}

		update_post_meta( $id, 'spd_beat_template', $template );
		update_post_meta( $id, 'spd_total_pages', $total_pages );
		update_post_meta( $id, 'spd_beats', wp_json_encode( $beats ) );

		return rest_ensure_response( array(
			'template'    => $template,
			'total_pages' => $total_pages,
			'beats'       => $beats,
		) );
	}

	/* ---------------------------------------------------------------- */
	/* Imports                                                           */
	/* ---------------------------------------------------------------- */

	public static function get_imports( $request ) {
		$project_id = (int) $request['id'];
		$atts       = get_posts( array(
			'post_type'      => 'attachment',
			'post_parent'    => $project_id,
			'posts_per_page' => -1,
			'post_status'    => 'inherit',
		) );

		return rest_ensure_response( array_map( function ( $a ) {
			return array(
				'id'       => $a->ID,
				'title'    => get_the_title( $a ),
				'category' => get_post_meta( $a->ID, 'spd_import_category', true ),
				'url'      => wp_get_attachment_url( $a->ID ),
				'mime'     => $a->post_mime_type,
				'date'     => get_the_date( 'Y-m-d', $a ),
			);
		}, $atts ) );
	}

	public static function upload_import( $request ) {
		$project_id = (int) $request['id'];
		if ( ! get_post( $project_id ) ) {
			return new WP_Error( 'spd_not_found', 'Project not found.', array( 'status' => 404 ) );
		}

		$files = $request->get_file_params();
		if ( empty( $files['file'] ) ) {
			return new WP_Error( 'spd_no_file', 'No file was uploaded.', array( 'status' => 400 ) );
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';

		$attachment_id = media_handle_upload( 'file', $project_id );
		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		$category = self::str_param( $request, 'category', 'research' );
		update_post_meta( $attachment_id, 'spd_import_category', $category );

		return rest_ensure_response( array(
			'id'       => $attachment_id,
			'title'    => get_the_title( $attachment_id ),
			'category' => $category,
			'url'      => wp_get_attachment_url( $attachment_id ),
		) );
	}

	public static function delete_import( $request ) {
		$id = (int) $request['id'];
		if ( ! wp_attachment_is( 'document', $id ) && ! get_post( $id ) ) {
			return new WP_Error( 'spd_not_found', 'Not found.', array( 'status' => 404 ) );
		}
		wp_delete_attachment( $id, true );
		return rest_ensure_response( array( 'deleted' => true ) );
	}

	/* ---------------------------------------------------------------- */
	/* Profile                                                           */
	/* ---------------------------------------------------------------- */

	private static function get_profile_data() {
		$defaults = array(
			'name'              => '',
			'title'             => '',
			'company'           => '',
			'location'          => '',
			'email'             => '',
			'phone'             => '',
			'website'           => '',
			'linkedin'          => '',
			'imdb'              => '',
			'bio'               => '',
			'short_bio'         => '',
			'creative_statement'=> '',
			'expertise'         => array(),
			'genres'            => array(),
			'formats'           => array(),
			'skills'            => array(),
			'experience'        => array(), // { role, company, period, desc }
			'awards'            => array(), // { name, org, year, project }
			'public_profile'    => false,
		);
		$saved = get_option( 'spd_creator_profile', array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
	}

	public static function get_profile() {
		return rest_ensure_response( self::get_profile_data() );
	}

	public static function save_profile( $request ) {
		$data = self::get_profile_data();
		foreach ( array( 'name', 'title', 'company', 'location', 'email', 'phone', 'website', 'linkedin', 'imdb' ) as $key ) {
			if ( null !== $request->get_param( $key ) ) {
				$data[ $key ] = sanitize_text_field( $request->get_param( $key ) );
			}
		}
		foreach ( array( 'bio', 'short_bio', 'creative_statement' ) as $key ) {
			if ( null !== $request->get_param( $key ) ) {
				$data[ $key ] = sanitize_textarea_field( $request->get_param( $key ) );
			}
		}
		foreach ( array( 'expertise', 'genres', 'formats', 'skills' ) as $key ) {
			if ( null !== $request->get_param( $key ) ) {
				$data[ $key ] = array_values( array_map( 'sanitize_text_field', (array) $request->get_param( $key ) ) );
			}
		}
		foreach ( array( 'experience', 'awards' ) as $key ) {
			if ( null !== $request->get_param( $key ) ) {
				$data[ $key ] = array_values( array_map( function ( $row ) {
					return is_array( $row ) ? array_map( 'sanitize_text_field', $row ) : array();
				}, (array) $request->get_param( $key ) ) );
			}
		}
		if ( null !== $request->get_param( 'public_profile' ) ) {
			$data['public_profile'] = (bool) $request->get_param( 'public_profile' );
		}
		update_option( 'spd_creator_profile', $data );
		return rest_ensure_response( $data );
	}

	/* ---------------------------------------------------------------- */
	/* Billing (display only — no payment processing)                   */
	/* ---------------------------------------------------------------- */

	/**
	 * Shared with SPD_Public_Site so the marketing homepage's pricing
	 * section always matches what the Billing screen shows.
	 */
	public static function plans_data() {
		return array(
			array(
				'id'          => 'creator',
				'name'        => 'Creator',
				'tagline'     => 'Start building your creative universe.',
				'price'       => 0,
				'price_annual'=> 0,
				'period'      => '',
				'ribbon'      => null,
				'features'    => array(
					'Up to 15 Projects', 'Up to 3 Franchises', 'Unlimited Loglines', '50 Characters',
					'Basic Project Database', 'Project Workspace', 'Basic Tags & Metadata', 'PDF Exports',
					'2 GB Cloud Storage', 'Offline Access', 'Public Creator Profile',
				),
			),
			array(
				'id'          => 'pro',
				'name'        => 'Pro',
				'tagline'     => 'For creators actively developing stories and franchises.',
				'price'       => 8,
				'price_annual'=> 79,
				'period'      => '/mo',
				'ribbon'      => 'Most Popular',
				'features'    => array(
					'Everything in Creator, plus:', 'Unlimited Projects', 'Unlimited Franchises', 'Unlimited Characters',
					'Character Database', 'Beat Sheet Calculator', 'Relationship Mapping', 'Import Assets',
					'Advanced Exports', '25 GB Cloud Storage', 'Franchise Database', 'Priority Support',
				),
			),
			array(
				'id'          => 'studio',
				'name'        => 'Studio',
				'tagline'     => 'For serious creators, teams, and production companies.',
				'price'       => 19,
				'price_annual'=> 190,
				'period'      => '/mo',
				'ribbon'      => null,
				'features'    => array(
					'Everything in Pro, plus:', 'Team Workspace', 'Project Analytics', 'Development Progress Tracking',
					'Collaboration Workspace', 'Team Permissions', 'Shared Libraries', 'Version History',
					'100 GB Cloud Storage', 'Advanced Exports', 'Priority Feature Access', 'Beta Testing Program',
				),
			),
		);
	}

	public static function get_billing() {
		$plan_id = get_option( 'spd_billing_plan', 'creator' );

		return rest_ensure_response( array(
			'current_plan'   => $plan_id,
			'plans'          => self::plans_data(),
			'payment_method' => null,
			'note'           => 'Billing is informational only in this build — no payment processing is connected.',
		) );
	}
}
