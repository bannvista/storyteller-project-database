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

	private static function can_manage() {
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

	private static function str_param( $request, $key, $default = '' ) {
		$val = $request->get_param( $key );
		return null === $val ? $default : sanitize_text_field( $val );
	}

	private static function text_param( $request, $key, $default = '' ) {
		$val = $request->get_param( $key );
		return null === $val ? $default : sanitize_textarea_field( $val );
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
		update_post_meta( $id, 'spd_type', self::str_param( $request, 'type', 'feature' ) );
		update_post_meta( $id, 'spd_stage', self::str_param( $request, 'stage', 'idea' ) );
		update_post_meta( $id, 'spd_logline', self::text_param( $request, 'logline' ) );
		update_post_meta( $id, 'spd_synopsis', self::text_param( $request, 'synopsis' ) );
		update_post_meta( $id, 'spd_progress', max( 0, min( 100, (int) $request->get_param( 'progress' ) ) ) );
		update_post_meta( $id, 'spd_franchise_id', (int) $request->get_param( 'franchise_id' ) );
		update_post_meta( $id, 'spd_total_pages', max( 1, (int) ( $request->get_param( 'total_pages' ) ?: 100 ) ) );
		update_post_meta( $id, 'spd_beat_template', self::str_param( $request, 'beat_template', 'save_the_cat' ) );
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
		update_post_meta( $id, 'spd_status', self::str_param( $request, 'status', 'development' ) );
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
		);
	}

	public static function save_character( $id, $request ) {
		update_post_meta( $id, 'spd_role', self::str_param( $request, 'role', 'protagonist' ) );
		update_post_meta( $id, 'spd_project_id', (int) $request->get_param( 'project_id' ) );
		update_post_meta( $id, 'spd_arc', self::text_param( $request, 'arc' ) );
		if ( null !== $request->get_param( 'traits' ) ) {
			self::meta_json_set( $id, 'spd_traits', (array) $request->get_param( 'traits' ) );
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

		$to_distribution = function ( $counts ) use ( $total ) {
			$out = array();
			foreach ( $counts as $label => $count ) {
				$out[] = array(
					'label'   => $label,
					'count'   => $count,
					'percent' => $total ? round( ( $count / $total ) * 100 ) : 0,
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
			'website'           => '',
			'linkedin'          => '',
			'bio'               => '',
			'short_bio'         => '',
			'creative_statement'=> '',
			'expertise'         => array(),
		);
		$saved = get_option( 'spd_creator_profile', array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), $defaults );
	}

	public static function get_profile() {
		return rest_ensure_response( self::get_profile_data() );
	}

	public static function save_profile( $request ) {
		$data = self::get_profile_data();
		foreach ( array( 'name', 'title', 'company', 'location', 'email', 'website', 'linkedin' ) as $key ) {
			if ( null !== $request->get_param( $key ) ) {
				$data[ $key ] = sanitize_text_field( $request->get_param( $key ) );
			}
		}
		foreach ( array( 'bio', 'short_bio', 'creative_statement' ) as $key ) {
			if ( null !== $request->get_param( $key ) ) {
				$data[ $key ] = sanitize_textarea_field( $request->get_param( $key ) );
			}
		}
		if ( null !== $request->get_param( 'expertise' ) ) {
			$data['expertise'] = array_values( array_map( 'sanitize_text_field', (array) $request->get_param( 'expertise' ) ) );
		}
		update_option( 'spd_creator_profile', $data );
		return rest_ensure_response( $data );
	}

	/* ---------------------------------------------------------------- */
	/* Billing (display only — no payment processing)                   */
	/* ---------------------------------------------------------------- */

	public static function get_billing() {
		$plan_id = get_option( 'spd_billing_plan', 'creator_free' );

		return rest_ensure_response( array(
			'current_plan' => $plan_id,
			'plans'        => array(
				array(
					'id'       => 'creator_free',
					'name'     => 'Creator — Free',
					'price'    => 0,
					'period'   => '',
					'features' => array( 'Up to 5 projects', 'Logline builder', 'Community access', 'Basic character profiles', 'Beat sheet calculator' ),
				),
				array(
					'id'       => 'pro',
					'name'     => 'Pro',
					'price'    => 8,
					'period'   => '/mo',
					'features' => array( 'Unlimited projects', 'Creative IP record', 'Advanced exports', 'Priority support' ),
				),
			),
			'payment_method' => null,
			'note'           => 'Billing is informational only in this build — no payment processing is connected.',
		) );
	}
}
