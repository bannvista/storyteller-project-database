/**
 * Sandboxed sample data + a fetch() shim standing in for the real REST
 * API. Used only on the public /demo/ route so visitors can click around
 * without a WordPress account and without touching any real site data.
 * Mirrors includes/class-beat-templates.php and includes/class-rest-api.php
 * closely enough that the same app.js works unmodified against either.
 */
(function () {
	'use strict';

	var nextId = 100;
	var store = {
		franchises: [
			{ id: 1, title: 'The Meridian Universe', description: 'A shared universe where memory, identity, and time intersect across film, television, and graphic novel formats.', status: 'active', genres: [ 'Thriller', 'Sci-Fi', 'Noir' ] },
			{ id: 2, title: 'Epoch Saga', description: 'A transmedia IP exploring the collapse and rebirth of civilizations across fractured timelines.', status: 'development', genres: [ 'Sci-Fi', 'Fantasy' ] }
		],
		projects: [
			{ id: 1, title: 'Neon Requiem', type: 'feature', stage: 'script', logline: 'A retired detective in a rain-soaked neon city uncovers a conspiracy that threatens to erase the people he swore to protect.', synopsis: '', progress: 78, genres: [ 'Sci-Fi', 'Noir' ], franchise_id: 1, total_pages: 110, beat_template: 'save_the_cat', date: '2026-06-28' },
			{ id: 2, title: 'The Glass Meridian', type: 'tv_series', stage: 'pitch', logline: 'Six strangers connected by a single photograph discover they are living parallel lives across different timelines.', synopsis: '', progress: 45, genres: [ 'Thriller', 'Drama' ], franchise_id: 1, total_pages: 60, beat_template: 'tv_pilot', date: '2026-06-25' },
			{ id: 3, title: 'Ashwood', type: 'novel', stage: 'outline', logline: 'A family estate holds the key to three generations of buried trauma.', synopsis: '', progress: 20, genres: [ 'Drama' ], franchise_id: 0, total_pages: 320, beat_template: 'three_act', date: '2026-06-10' },
			{ id: 4, title: 'Epoch: Origins', type: 'game', stage: 'idea', logline: 'Before the fracture, one civilization chose who would be remembered.', synopsis: '', progress: 5, genres: [ 'Sci-Fi', 'Fantasy' ], franchise_id: 2, total_pages: 100, beat_template: 'three_act', date: '2026-05-30' },
			{ id: 5, title: 'Low Tide', type: 'short', stage: 'idea', logline: 'A lighthouse keeper receives a radio signal from a ship that sank forty years ago.', synopsis: '', progress: 10, genres: [ 'Fantasy' ], franchise_id: 0, total_pages: 15, beat_template: 'three_act', date: '2026-05-02' },
			{ id: 6, title: 'The Long Static', type: 'feature', stage: 'complete', logline: 'A radio DJ becomes the last line of communication during a nationwide blackout.', synopsis: '', progress: 100, genres: [ 'Thriller' ], franchise_id: 0, total_pages: 104, beat_template: 'save_the_cat', date: '2026-03-14' }
		],
		characters: [
			{ id: 1, name: 'Detective Mara Voss', role: 'protagonist', project_id: 1, arc: 'From self-imposed exile to confronting the system she once protected.', traits: [ 'Morally complex', 'Driven', 'Isolated' ] },
			{ id: 2, name: 'The Architect', role: 'antagonist', project_id: 2, arc: 'Revealed as the hidden orchestrator of the timeline fractures.', traits: [ 'Mysterious', 'Calculating', 'Tragic' ] },
			{ id: 3, name: 'Eli Ashwood', role: 'protagonist', project_id: 3, arc: 'From denial to confronting generational trauma.', traits: [ 'Analytical', 'Haunted', 'Determined' ] },
			{ id: 4, name: 'Sera Kline', role: 'supporting', project_id: 2, arc: 'The one constant across every parallel life.', traits: [ 'Loyal', 'Guarded' ] }
		],
		imports: {},
		profile: {
			name: 'Jordan Mercer', title: 'Screenwriter & Producer', company: 'Meridian Films Inc.', location: 'Los Angeles, CA',
			email: 'jordan@meridianfilms.com', website: 'meridianfilms.com', linkedin: 'linkedin.com/in/jordanmercer',
			bio: 'Jordan Mercer is a Los Angeles-based screenwriter and producer with over a decade of experience developing feature films and television projects. Known for character-driven narratives that blend genre and literary ambition, Jordan has developed projects for major studios and independent financiers.',
			short_bio: 'Screenwriter & Producer · Meridian Films Inc. · Sundance Lab Alum',
			creative_statement: 'I write stories about people at the edges of what they believe — genre as a lens for intimate truth.',
			expertise: [ 'Feature Screenwriting', 'TV Pilots', 'Adaptation', 'Story Editing' ]
		},
		billing_plan: 'creator_free'
	};

	var BEAT_TEMPLATES = {
		save_the_cat: { label: 'Feature Film (Save the Cat)', beats: [
			[ 'Opening Image', 1 / 110, "The world before. A snapshot of the theme's problem." ],
			[ 'Theme Stated', 5 / 110, 'The thematic premise, spoken by a character who does not understand it yet.' ],
			[ 'Set-Up', 10 / 110, "Introduce the protagonist's ordinary world. Plant what will pay off later." ],
			[ 'Catalyst', 12 / 110, "Something happens to shake up the protagonist's world." ],
			[ 'Debate', 25 / 110, 'Should I go? Can I really do this? The last chance to turn back.' ],
			[ 'Break into Two', 25 / 110, 'The protagonist makes a choice and enters the upside-down version of the ordinary world.' ],
			[ 'B Story', 30 / 110, 'A new relationship carries the theme.' ],
			[ 'Fun and Games', 55 / 110, 'The "promise of the premise" — the trailer moments.' ],
			[ 'Midpoint', 55 / 110, 'A false victory or false defeat; stakes are raised.' ],
			[ 'Bad Guys Close In', 75 / 110, 'Internal and external forces regroup and tighten.' ],
			[ 'All Is Lost', 75 / 110, 'The lowest point; a "whiff of death."' ],
			[ 'Dark Night of the Soul', 85 / 110, 'The protagonist hits bottom before the answer arrives.' ],
			[ 'Break into Three', 85 / 110, 'The A and B stories combine; the solution is found.' ],
			[ 'Finale', 110 / 110, 'The protagonist proves change by acting on what was learned.' ],
			[ 'Final Image', 110 / 110, "The world after — the theme's opposite of the opening image." ]
		] },
		three_act: { label: 'Three-Act Structure (generic)', beats: [
			[ 'Hook', 1 / 100, 'Grab attention before establishing normal life.' ],
			[ 'Inciting Incident', 10 / 100, 'The event that sets the story in motion.' ],
			[ 'First Plot Point', 25 / 100, 'The protagonist commits to the journey.' ],
			[ 'Midpoint', 50 / 100, 'A shift from reaction to action; new information changes the goal.' ],
			[ 'Second Plot Point', 75 / 100, 'The last piece of information needed for the climax arrives.' ],
			[ 'Climax', 90 / 100, 'The central conflict is resolved.' ],
			[ 'Resolution', 100 / 100, 'The new equilibrium is shown.' ]
		] },
		tv_pilot: { label: 'TV Pilot (Teleplay)', beats: [
			[ 'Teaser', 3 / 60, 'A cold open that hooks before the titles.' ],
			[ 'Act One Turn', 12 / 60, "The pilot's premise is set in motion." ],
			[ 'Act Two Turn', 24 / 60, 'Complications escalate; the ensemble is established.' ],
			[ 'Midpoint Reveal', 30 / 60, 'A reveal that reframes the series engine.' ],
			[ 'Act Three Turn', 42 / 60, 'The A and B stories collide.' ],
			[ 'Act Four Crisis', 52 / 60, "The episode's crisis point." ],
			[ 'Button', 60 / 60, 'The closing image or line that sets up the series going forward.' ]
		] }
	};

	function generateBeats( templateKey, totalPages ) {
		var tpl = BEAT_TEMPLATES[ templateKey ] || BEAT_TEMPLATES.save_the_cat;
		totalPages = Math.max( 1, parseInt( totalPages, 10 ) || 1 );
		var lastPage = 0;
		return tpl.beats.map( function ( b ) {
			var page = Math.round( b[1] * totalPages );
			page = Math.max( lastPage + 1, page );
			page = Math.min( page, totalPages );
			lastPage = page;
			return { beat: b[0], page: page, description: b[2] };
		} );
	}

	function json( data ) {
		return Promise.resolve( { ok: true, json: function () { return Promise.resolve( data ); } } );
	}
	function notFound() {
		return Promise.resolve( { ok: false, json: function () { return Promise.resolve( { message: 'Not found.' } ); } } );
	}

	function serializeFranchise( f ) {
		var linked = store.projects.filter( function ( p ) { return p.franchise_id === f.id; } )
			.map( function ( p ) { return { id: p.id, title: p.title, stage: p.stage, type: p.type }; } );
		return Object.assign( {}, f, { projects: linked } );
	}
	function serializeCharacter( c ) {
		var project = store.projects.find( function ( p ) { return p.id === c.project_id; } );
		return Object.assign( {}, c, { project_name: project ? project.title : '' } );
	}

	function readBody( opts ) {
		if ( ! opts || ! opts.body ) { return {}; }
		if ( opts.body instanceof FormData ) {
			var out = {};
			opts.body.forEach( function ( v, k ) { out[ k ] = v; } );
			return out;
		}
		try { return JSON.parse( opts.body ); } catch ( e ) { return {}; }
	}

	window.fetch = function ( url, opts ) {
		opts = opts || {};
		var method = ( opts.method || 'GET' ).toUpperCase();
		var path = url.replace( SPD.restUrl, '' ).split( '?' )[0];
		var body = readBody( opts );
		var m;

		if ( path === 'dashboard' && method === 'GET' ) {
			var genreCounts = {}, typeCounts = {}, complete = 0;
			store.projects.forEach( function ( p ) {
				if ( p.stage === 'complete' ) { complete++; }
				p.genres.forEach( function ( g ) { genreCounts[ g ] = ( genreCounts[ g ] || 0 ) + 1; } );
				typeCounts[ p.type ] = ( typeCounts[ p.type ] || 0 ) + 1;
			} );
			var total = store.projects.length;
			function toDist( counts ) {
				return Object.keys( counts ).map( function ( label ) {
					return { label: label, count: counts[ label ], percent: total ? Math.round( ( counts[ label ] / total ) * 100 ) : 0 };
				} ).sort( function ( a, b ) { return b.count - a.count; } );
			}
			return json( {
				creator_name: store.profile.name.split( ' ' )[0],
				total_projects: total,
				franchises: store.franchises.length,
				characters: store.characters.length,
				complete: complete,
				genre_distribution: toDist( genreCounts ),
				type_distribution: toDist( typeCounts )
			} );
		}

		if ( path === 'projects' && method === 'GET' ) { return json( store.projects ); }
		if ( path === 'projects' && method === 'POST' ) {
			var np = { id: nextId++, title: body.title || 'Untitled', type: body.type || 'feature', stage: body.stage || 'idea',
				logline: body.logline || '', synopsis: body.synopsis || '', progress: parseInt( body.progress, 10 ) || 0,
				genres: body.genres || [], franchise_id: parseInt( body.franchise_id, 10 ) || 0, total_pages: 100, beat_template: 'save_the_cat',
				date: new Date().toISOString().slice( 0, 10 ) };
			store.projects.unshift( np );
			return json( np );
		}
		if ( ( m = path.match( /^projects\/(\d+)$/ ) ) ) {
			var pid = parseInt( m[1], 10 );
			var idx = store.projects.findIndex( function ( p ) { return p.id === pid; } );
			if ( idx === -1 ) { return notFound(); }
			if ( method === 'GET' ) { return json( store.projects[ idx ] ); }
			if ( method === 'PUT' ) {
				var existing = store.projects[ idx ];
				Object.assign( existing, {
					title: body.title || existing.title, type: body.type || existing.type, stage: body.stage || existing.stage,
					logline: body.logline || '', synopsis: body.synopsis || '', progress: parseInt( body.progress, 10 ) || 0,
					franchise_id: parseInt( body.franchise_id, 10 ) || 0, genres: body.genres || existing.genres
				} );
				return json( existing );
			}
			if ( method === 'DELETE' ) { store.projects.splice( idx, 1 ); return json( { deleted: true } ); }
		}

		if ( path === 'franchises' && method === 'GET' ) { return json( store.franchises.map( serializeFranchise ) ); }
		if ( path === 'franchises' && method === 'POST' ) {
			var nf = { id: nextId++, title: body.title || 'Untitled', description: body.description || '', status: body.status || 'development', genres: body.genres || [] };
			store.franchises.unshift( nf );
			return json( serializeFranchise( nf ) );
		}
		if ( ( m = path.match( /^franchises\/(\d+)$/ ) ) ) {
			var fid = parseInt( m[1], 10 );
			var fidx = store.franchises.findIndex( function ( f ) { return f.id === fid; } );
			if ( fidx === -1 ) { return notFound(); }
			if ( method === 'GET' ) { return json( serializeFranchise( store.franchises[ fidx ] ) ); }
			if ( method === 'PUT' ) {
				Object.assign( store.franchises[ fidx ], { status: body.status || store.franchises[ fidx ].status, description: body.description, genres: body.genres || store.franchises[ fidx ].genres } );
				return json( serializeFranchise( store.franchises[ fidx ] ) );
			}
			if ( method === 'DELETE' ) { store.franchises.splice( fidx, 1 ); return json( { deleted: true } ); }
		}

		if ( path === 'characters' && method === 'GET' ) { return json( store.characters.map( serializeCharacter ) ); }
		if ( path === 'characters' && method === 'POST' ) {
			var nc = { id: nextId++, name: body.title || 'Untitled', role: body.role || 'protagonist', project_id: parseInt( body.project_id, 10 ) || 0, arc: body.arc || '', traits: body.traits || [] };
			store.characters.unshift( nc );
			return json( serializeCharacter( nc ) );
		}
		if ( ( m = path.match( /^characters\/(\d+)$/ ) ) ) {
			var cid = parseInt( m[1], 10 );
			var cidx = store.characters.findIndex( function ( c ) { return c.id === cid; } );
			if ( cidx === -1 ) { return notFound(); }
			if ( method === 'GET' ) { return json( serializeCharacter( store.characters[ cidx ] ) ); }
			if ( method === 'PUT' ) {
				Object.assign( store.characters[ cidx ], { name: body.title || store.characters[ cidx ].name, role: body.role, project_id: parseInt( body.project_id, 10 ) || 0, arc: body.arc || '', traits: body.traits || [] } );
				return json( serializeCharacter( store.characters[ cidx ] ) );
			}
			if ( method === 'DELETE' ) { store.characters.splice( cidx, 1 ); return json( { deleted: true } ); }
		}

		if ( path === 'beat-templates' && method === 'GET' ) {
			return json( Object.keys( BEAT_TEMPLATES ).map( function ( key ) { return { key: key, label: BEAT_TEMPLATES[ key ].label }; } ) );
		}

		if ( ( m = path.match( /^projects\/(\d+)\/beatsheet$/ ) ) ) {
			var bpid = parseInt( m[1], 10 );
			var proj = store.projects.find( function ( p ) { return p.id === bpid; } );
			if ( ! proj ) { return notFound(); }
			if ( method === 'GET' ) {
				return json( { template: proj.beat_template, total_pages: proj.total_pages, beats: proj._beats || generateBeats( proj.beat_template, proj.total_pages ) } );
			}
			if ( method === 'POST' ) {
				proj.beat_template = body.template || proj.beat_template;
				proj.total_pages = parseInt( body.total_pages, 10 ) || proj.total_pages;
				proj._beats = generateBeats( proj.beat_template, proj.total_pages );
				return json( { template: proj.beat_template, total_pages: proj.total_pages, beats: proj._beats } );
			}
		}

		if ( ( m = path.match( /^projects\/(\d+)\/imports$/ ) ) ) {
			var ipid = m[1];
			store.imports[ ipid ] = store.imports[ ipid ] || [];
			if ( method === 'GET' ) { return json( store.imports[ ipid ] ); }
			if ( method === 'POST' ) {
				var file = opts.body.get( 'file' );
				var item = { id: nextId++, title: file ? file.name : 'file', category: opts.body.get( 'category' ), url: '#', mime: file ? file.type : '', date: new Date().toISOString().slice( 0, 10 ) };
				store.imports[ ipid ].unshift( item );
				return json( item );
			}
		}
		if ( ( m = path.match( /^imports\/(\d+)$/ ) ) && method === 'DELETE' ) {
			Object.keys( store.imports ).forEach( function ( pid ) {
				store.imports[ pid ] = store.imports[ pid ].filter( function ( it ) { return it.id !== parseInt( m[1], 10 ); } );
			} );
			return json( { deleted: true } );
		}

		if ( path === 'profile' && method === 'GET' ) { return json( store.profile ); }
		if ( path === 'profile' && method === 'PUT' ) { Object.assign( store.profile, body ); return json( store.profile ); }

		if ( path === 'billing' && method === 'GET' ) {
			return json( {
				current_plan: store.billing_plan,
				plans: [
					{ id: 'creator_free', name: 'Creator — Free', price: 0, period: '', features: [ 'Up to 5 projects', 'Logline builder', 'Community access', 'Basic character profiles', 'Beat sheet calculator' ] },
					{ id: 'pro', name: 'Pro', price: 8, period: '/mo', features: [ 'Unlimited projects', 'Creative IP record', 'Advanced exports', 'Priority support' ] }
				]
			} );
		}

		return notFound();
	};
})();
