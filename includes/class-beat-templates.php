<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Beat sheet templates and the generator that scales a template's beats to
 * an arbitrary page count. Fractions below are Blake Snyder's classic
 * Save the Cat proportions (out of a 110-page feature) and the standard
 * teleplay/three-act proportions used industry-wide; scaling by fraction
 * of total_pages keeps the beats proportionally correct for any length.
 */
class SPD_Beat_Templates {

	public static function templates() {
		return array(
			'save_the_cat' => array(
				'label' => 'Feature Film (Save the Cat)',
				'beats' => array(
					array( 'name' => 'Opening Image', 'fraction' => 1 / 110, 'description' => "The world before. A snapshot of the theme's problem." ),
					array( 'name' => 'Theme Stated', 'fraction' => 5 / 110, 'description' => 'The thematic premise, spoken by a character who does not understand it yet.' ),
					array( 'name' => 'Set-Up', 'fraction' => 10 / 110, 'description' => "Introduce the protagonist's ordinary world. Plant what will pay off later." ),
					array( 'name' => 'Catalyst', 'fraction' => 12 / 110, 'description' => "Something happens to shake up the protagonist's world." ),
					array( 'name' => 'Debate', 'fraction' => 25 / 110, 'description' => "Should I go? Can I really do this? The last chance to turn back." ),
					array( 'name' => 'Break into Two', 'fraction' => 25 / 110, 'description' => 'The protagonist makes a choice and enters the upside-down version of the ordinary world.' ),
					array( 'name' => 'B Story', 'fraction' => 30 / 110, 'description' => 'A new relationship carries the theme.' ),
					array( 'name' => 'Fun and Games', 'fraction' => 55 / 110, 'description' => 'The "promise of the premise" — the trailer moments.' ),
					array( 'name' => 'Midpoint', 'fraction' => 55 / 110, 'description' => 'A false victory or false defeat; stakes are raised.' ),
					array( 'name' => 'Bad Guys Close In', 'fraction' => 75 / 110, 'description' => 'Internal and external forces regroup and tighten.' ),
					array( 'name' => 'All Is Lost', 'fraction' => 75 / 110, 'description' => 'The lowest point; a "whiff of death."' ),
					array( 'name' => 'Dark Night of the Soul', 'fraction' => 85 / 110, 'description' => 'The protagonist hits bottom before the answer arrives.' ),
					array( 'name' => 'Break into Three', 'fraction' => 85 / 110, 'description' => 'The A and B stories combine; the solution is found.' ),
					array( 'name' => 'Finale', 'fraction' => 110 / 110, 'description' => 'The protagonist proves change by acting on what was learned.' ),
					array( 'name' => 'Final Image', 'fraction' => 110 / 110, 'description' => "The world after — the theme's opposite of the opening image." ),
				),
			),
			'three_act' => array(
				'label' => 'Three-Act Structure (generic)',
				'beats' => array(
					array( 'name' => 'Hook', 'fraction' => 1 / 100, 'description' => 'Grab attention before establishing normal life.' ),
					array( 'name' => 'Inciting Incident', 'fraction' => 10 / 100, 'description' => 'The event that sets the story in motion.' ),
					array( 'name' => 'First Plot Point', 'fraction' => 25 / 100, 'description' => 'The protagonist commits to the journey.' ),
					array( 'name' => 'Midpoint', 'fraction' => 50 / 100, 'description' => 'A shift from reaction to action; new information changes the goal.' ),
					array( 'name' => 'Second Plot Point', 'fraction' => 75 / 100, 'description' => 'The last piece of information needed for the climax arrives.' ),
					array( 'name' => 'Climax', 'fraction' => 90 / 100, 'description' => 'The central conflict is resolved.' ),
					array( 'name' => 'Resolution', 'fraction' => 100 / 100, 'description' => 'The new equilibrium is shown.' ),
				),
			),
			'tv_pilot' => array(
				'label' => 'TV Pilot (Teleplay)',
				'beats' => array(
					array( 'name' => 'Teaser', 'fraction' => 3 / 60, 'description' => 'A cold open that hooks before the titles.' ),
					array( 'name' => 'Act One Turn', 'fraction' => 12 / 60, 'description' => 'The pilot\'s premise is set in motion.' ),
					array( 'name' => 'Act Two Turn', 'fraction' => 24 / 60, 'description' => 'Complications escalate; the ensemble is established.' ),
					array( 'name' => 'Midpoint Reveal', 'fraction' => 30 / 60, 'description' => 'A reveal that reframes the series engine.' ),
					array( 'name' => 'Act Three Turn', 'fraction' => 42 / 60, 'description' => 'The A and B stories collide.' ),
					array( 'name' => 'Act Four Crisis', 'fraction' => 52 / 60, 'description' => 'The episode\'s crisis point.' ),
					array( 'name' => 'Button', 'fraction' => 60 / 60, 'description' => 'The closing image or line that sets up the series going forward.' ),
				),
			),
		);
	}

	public static function get( $key ) {
		$templates = self::templates();
		return isset( $templates[ $key ] ) ? $templates[ $key ] : null;
	}

	/**
	 * Scales a template's beats to the given total page count.
	 *
	 * @return array[] List of ['beat' => string, 'page' => int, 'description' => string].
	 */
	public static function generate( $template_key, $total_pages ) {
		$template = self::get( $template_key );
		if ( ! $template ) {
			return new WP_Error( 'spd_unknown_template', 'Unknown beat sheet template.' );
		}

		$total_pages = max( 1, (int) $total_pages );
		$beats       = array();
		$last_page   = 0;

		foreach ( $template['beats'] as $beat ) {
			$page = (int) round( $beat['fraction'] * $total_pages );
			$page = max( $last_page + 1, $page );
			$page = min( $page, $total_pages );

			$beats[] = array(
				'beat'        => $beat['name'],
				'page'        => $page,
				'description' => $beat['description'],
			);

			$last_page = $page;
		}

		return $beats;
	}
}
