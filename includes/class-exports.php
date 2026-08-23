<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The "Export One-Sheet" feature. Renders a printable HTML page from the
 * project's own data (title, logline, genres, progress, beat sheet) — the
 * browser's own print-to-PDF handles the file conversion, so no PDF
 * library dependency is needed on the host.
 */
class SPD_Exports {

	public static function init() {
		add_action( 'admin_post_spd_export_onesheet', array( __CLASS__, 'render_onesheet' ) );
	}

	public static function render_onesheet() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'You do not have permission to do this.', 403 );
		}

		check_admin_referer( 'spd_export_onesheet' );

		$project_id = isset( $_GET['project_id'] ) ? (int) $_GET['project_id'] : 0;
		$project    = get_post( $project_id );

		if ( ! $project || $project->post_type !== SPD_Post_Types::PROJECT ) {
			wp_die( 'Project not found.', 404 );
		}

		$genres  = json_decode( get_post_meta( $project_id, 'spd_genres', true ), true ) ?: array();
		$beats   = json_decode( get_post_meta( $project_id, 'spd_beats', true ), true ) ?: array();
		$logline = get_post_meta( $project_id, 'spd_logline', true );
		$synopsis= get_post_meta( $project_id, 'spd_synopsis', true );
		$stage   = get_post_meta( $project_id, 'spd_stage', true );
		$type    = get_post_meta( $project_id, 'spd_type', true );
		$progress= (int) get_post_meta( $project_id, 'spd_progress', true );

		header( 'Content-Type: text/html; charset=utf-8' );
		?>
		<!doctype html>
		<html>
		<head>
		<meta charset="utf-8">
		<title><?php echo esc_html( get_the_title( $project ) ); ?> — One-Sheet</title>
		<style>
			body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; line-height: 1.5; }
			h1 { font-size: 28px; margin-bottom: 4px; }
			.meta { color: #555; font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 24px; }
			.tag { display: inline-block; border: 1px solid #999; border-radius: 999px; padding: 2px 10px; margin-right: 6px; font-family: Arial, sans-serif; font-size: 12px; }
			h2 { font-size: 16px; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-top: 32px; }
			table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; }
			td, th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
			@media print { body { margin: 0; } }
		</style>
		</head>
		<body>
			<h1><?php echo esc_html( get_the_title( $project ) ); ?></h1>
			<div class="meta">
				<?php echo esc_html( ucwords( str_replace( '_', ' ', $type ) ) ); ?> ·
				<?php echo esc_html( ucwords( str_replace( '_', ' ', $stage ) ) ); ?> ·
				<?php echo (int) $progress; ?>% complete
			</div>
			<div>
				<?php foreach ( $genres as $g ) : ?>
					<span class="tag"><?php echo esc_html( $g ); ?></span>
				<?php endforeach; ?>
			</div>

			<?php if ( $logline ) : ?>
				<h2>Logline</h2>
				<p><?php echo esc_html( $logline ); ?></p>
			<?php endif; ?>

			<?php if ( $synopsis ) : ?>
				<h2>Synopsis</h2>
				<p><?php echo nl2br( esc_html( $synopsis ) ); ?></p>
			<?php endif; ?>

			<?php if ( $beats ) : ?>
				<h2>Beat Sheet</h2>
				<table>
					<thead><tr><th>Beat</th><th>Pg</th><th>Description</th></tr></thead>
					<tbody>
					<?php foreach ( $beats as $b ) : ?>
						<tr>
							<td><?php echo esc_html( $b['beat'] ); ?></td>
							<td><?php echo esc_html( $b['page'] ); ?></td>
							<td><?php echo esc_html( $b['description'] ); ?></td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>

			<script>window.onload = function(){ window.print(); };</script>
		</body>
		</html>
		<?php
		exit;
	}

	public static function get_export_url( $project_id ) {
		return wp_nonce_url(
			admin_url( 'admin-post.php?action=spd_export_onesheet&project_id=' . (int) $project_id ),
			'spd_export_onesheet'
		);
	}
}
