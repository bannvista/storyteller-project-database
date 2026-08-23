(function () {
	'use strict';

	var root = document.getElementById( 'spd-app' );
	if ( ! root || typeof SPD === 'undefined' ) {
		return;
	}

	/* ---------------------------------------------------------------- */
	/* API helper                                                        */
	/* ---------------------------------------------------------------- */

	function api( path, options ) {
		options = options || {};
		var headers = Object.assign( { 'X-WP-Nonce': SPD.restNonce }, options.headers || {} );
		var opts = Object.assign( {}, options, { headers: headers, credentials: 'same-origin' } );

		if ( opts.body && ! ( opts.body instanceof FormData ) && typeof opts.body !== 'string' ) {
			opts.body = JSON.stringify( opts.body );
			headers['Content-Type'] = 'application/json';
		}

		return fetch( SPD.restUrl + path, opts ).then( function ( res ) {
			return res.json().then( function ( data ) {
				if ( ! res.ok ) {
					throw new Error( data && data.message ? data.message : 'Request failed.' );
				}
				return data;
			} );
		} );
	}

	function toast( message, isError ) {
		var el = document.createElement( 'div' );
		el.className = 'spd-toast' + ( isError ? ' error' : '' );
		el.textContent = message;
		document.body.appendChild( el );
		setTimeout( function () { el.remove(); }, 3200 );
	}

	function esc( str ) {
		if ( str === null || str === undefined ) { return ''; }
		return String( str ).replace( /[&<>"']/g, function ( c ) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ c ];
		} );
	}

	function titleCase( str ) {
		return String( str || '' ).replace( /_/g, ' ' ).replace( /\b\w/g, function ( c ) { return c.toUpperCase(); } );
	}

	function initials( name ) {
		var parts = String( name || '' ).trim().split( /\s+/ ).filter( Boolean );
		if ( ! parts.length ) { return '??'; }
		return ( parts[0][0] + ( parts.length > 1 ? parts[ parts.length - 1 ][0] : '' ) ).toUpperCase();
	}

	var PALETTE = [ '#9b8cf2', '#7fc8f8', '#f2a65a', '#68d391', '#f56e9f', '#ffd166', '#7ee8c7', '#c792ea' ];

	/* ---------------------------------------------------------------- */
	/* Static option lists                                               */
	/* ---------------------------------------------------------------- */

	var PROJECT_TYPES = [ 'feature', 'tv_series', 'novel', 'game', 'short', 'other' ];
	var PROJECT_STAGES = [ 'idea', 'outline', 'pitch', 'script', 'complete' ];
	var CHARACTER_ROLES = [ 'protagonist', 'antagonist', 'supporting' ];
	var FRANCHISE_STATUSES = [ 'development', 'active', 'paused', 'complete' ];

	var TYPE_ICON = { feature: '🎬', tv_series: '📺', novel: '📖', game: '🎮', short: '🎞️', other: '📁' };

	/* ---------------------------------------------------------------- */
	/* State + simple in-memory cache                                    */
	/* ---------------------------------------------------------------- */

	var cache = { projects: null, franchises: null, characters: null, beatTemplates: null };

	function loadProjects( force ) {
		if ( cache.projects && ! force ) { return Promise.resolve( cache.projects ); }
		return api( 'projects' ).then( function ( data ) { cache.projects = data; return data; } );
	}
	function loadFranchises( force ) {
		if ( cache.franchises && ! force ) { return Promise.resolve( cache.franchises ); }
		return api( 'franchises' ).then( function ( data ) { cache.franchises = data; return data; } );
	}
	function loadCharacters( force ) {
		if ( cache.characters && ! force ) { return Promise.resolve( cache.characters ); }
		return api( 'characters' ).then( function ( data ) { cache.characters = data; return data; } );
	}
	function loadBeatTemplates() {
		if ( cache.beatTemplates ) { return Promise.resolve( cache.beatTemplates ); }
		return api( 'beat-templates' ).then( function ( data ) { cache.beatTemplates = data; return data; } );
	}

	/* ---------------------------------------------------------------- */
	/* Layout shell                                                      */
	/* ---------------------------------------------------------------- */

	var NAV_ITEMS = [
		{ route: 'dashboard', label: 'Dashboard', icon: '▦' },
		{ route: 'projects', label: 'Project Database', icon: '📁' },
		{ route: 'franchises', label: 'Franchise Database', icon: '🔀' },
		{ route: 'characters', label: 'Character Database', icon: '👥' },
		{ route: 'beatsheet', label: 'Beat Sheet Calculator', icon: '📊' },
		{ route: 'imports', label: 'Imports / Exports', icon: '⇵' },
		{ route: 'billing', label: 'Billing', icon: '💳' },
		{ route: 'profile', label: 'Creator Profile', icon: '👤' }
	];

	function currentRoute() {
		return ( location.hash || '#/dashboard' ).replace( '#/', '' ) || 'dashboard';
	}

	function shell( innerHtml ) {
		var route = currentRoute();
		var navHtml = NAV_ITEMS.map( function ( item ) {
			return '<a href="#/' + item.route + '" class="' + ( item.route === route ? 'active' : '' ) + '">' +
				'<span class="spd-icon">' + item.icon + '</span>' + esc( item.label ) + '</a>';
		} ).join( '' );

		root.innerHTML =
			'<div class="spd-sidebar">' +
				'<div class="spd-brand"><div class="spd-brand-icon">🎬</div><div><div class="spd-brand-title">Project Database</div><div class="spd-brand-sub">for Storytellers</div></div></div>' +
				( SPD.backUrl ? '<a class="spd-back-link" href="' + esc( SPD.backUrl ) + '">← ' + esc( SPD.backLabel || 'Back' ) + '</a>' : '' ) +
				'<div class="spd-nav">' + navHtml + '</div>' +
				'<div class="spd-sidebar-footer"><div class="spd-avatar">' + esc( initials( SPD.userDisplayName ) ) + '</div>' +
				'<div><div class="spd-sidebar-footer-name">' + esc( SPD.userDisplayName ) + '</div><div class="spd-sidebar-footer-role">Screenwriter</div></div></div>' +
			'</div>' +
			'<div class="spd-main">' + innerHtml + '</div>';
	}

	/* ---------------------------------------------------------------- */
	/* Modal helper                                                      */
	/* ---------------------------------------------------------------- */

	function openModal( title, bodyHtml, onSubmit ) {
		var backdrop = document.createElement( 'div' );
		backdrop.className = 'spd-modal-backdrop';
		backdrop.innerHTML = '<div class="spd-modal"><h2>' + esc( title ) + '</h2><form>' + bodyHtml +
			'<div class="spd-modal-actions"><button type="button" class="spd-btn" data-cancel>Cancel</button>' +
			'<button type="submit" class="spd-btn spd-btn-primary">Save</button></div></form></div>';

		document.body.appendChild( backdrop );

		function close() { backdrop.remove(); }
		backdrop.addEventListener( 'click', function ( e ) { if ( e.target === backdrop ) { close(); } } );
		backdrop.querySelector( '[data-cancel]' ).addEventListener( 'click', close );
		backdrop.querySelector( 'form' ).addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			onSubmit( new FormData( e.target ), close );
		} );

		return backdrop;
	}

	function selectOptions( values, selected, labelFn ) {
		return values.map( function ( v ) {
			var val = typeof v === 'object' ? v.value : v;
			var label = labelFn ? labelFn( v ) : titleCase( v );
			return '<option value="' + esc( val ) + '"' + ( String( val ) === String( selected ) ? ' selected' : '' ) + '>' + esc( label ) + '</option>';
		} ).join( '' );
	}

	/* ---------------------------------------------------------------- */
	/* Dashboard                                                         */
	/* ---------------------------------------------------------------- */

	function renderDashboard() {
		shell( '<div class="spd-empty">Loading dashboard…</div>' );

		api( 'dashboard' ).then( function ( d ) {
			var donut = renderDonut( d.genre_distribution, d.type_distribution );

			shell(
				'<div class="spd-header">' +
					'<div><h1 class="spd-title">Good morning, ' + esc( d.creator_name || 'there' ) + '.</h1>' +
					'<p class="spd-subtitle">You have ' + d.total_projects + ' project' + ( d.total_projects === 1 ? '' : 's' ) + ' in your library.</p></div>' +
					'<button class="spd-btn spd-btn-primary" data-action="new-project">+ New Project</button>' +
				'</div>' +
				'<div class="spd-actions-row">' +
					'<button class="spd-btn" data-action="new-project">+ New Project</button>' +
					'<button class="spd-btn" data-action="new-character">👤 New Character</button>' +
					'<button class="spd-btn" data-action="new-franchise">🔀 New Franchise</button>' +
					'<a class="spd-btn" href="#/imports">⇧ Import File</a>' +
					'<a class="spd-btn" href="#/imports">⇩ Export One-Sheet</a>' +
				'</div>' +
				'<div class="spd-stats-grid">' +
					statTile( 'Total Projects', d.total_projects, '📁' ) +
					statTile( 'Franchises', d.franchises, '🔀' ) +
					statTile( 'Characters', d.characters, '👥' ) +
					statTile( 'Complete', d.complete, '✓' ) +
				'</div>' +
				'<div class="spd-panel">' +
					'<div class="spd-item-top"><div class="spd-panel-title">Genre Distribution</div>' +
					'<div class="spd-tabs"><button class="spd-tab active" data-donut-tab="genre">Genre</button><button class="spd-tab" data-donut-tab="type">Project Type</button></div></div>' +
					'<div id="spd-donut-holder">' + donut.genre + '</div>' +
				'</div>'
			);

			bindDashboardEvents( donut );
		} ).catch( function ( e ) { shell( '<div class="spd-empty">Failed to load dashboard: ' + esc( e.message ) + '</div>' ); } );
	}

	function statTile( label, value, icon ) {
		return '<div class="spd-stat"><div class="spd-stat-top"><span>' + esc( label ) + '</span><span>' + icon + '</span></div>' +
			'<div class="spd-stat-value">' + value + '</div></div>';
	}

	function renderDonut( genreDist, typeDist ) {
		function build( dist ) {
			if ( ! dist.length ) {
				return '<div class="spd-empty">No data yet.</div>';
			}
			var gradientParts = [];
			var acc = 0;
			var legend = dist.map( function ( row, i ) {
				var color = PALETTE[ i % PALETTE.length ];
				var start = acc;
				acc += row.percent;
				gradientParts.push( color + ' ' + start + '% ' + acc + '%' );
				return '<div class="spd-legend-row"><span class="spd-legend-dot" style="background:' + color + '"></span>' +
					'<span>' + esc( titleCase( row.label ) ) + '</span><span class="spd-legend-count">' + row.count + ' · ' + row.percent + '%</span></div>';
			} ).join( '' );
			var gradient = 'conic-gradient(' + gradientParts.join( ', ' ) + ')';
			return '<div class="spd-donut-row"><div class="spd-donut" style="background:' + gradient + '"></div>' +
				'<div class="spd-legend">' + legend + '</div></div>';
		}
		return { genre: build( genreDist ), type: build( typeDist ) };
	}

	function bindDashboardEvents( donut ) {
		root.querySelectorAll( '[data-donut-tab]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				root.querySelectorAll( '[data-donut-tab]' ).forEach( function ( b ) { b.classList.remove( 'active' ); } );
				btn.classList.add( 'active' );
				document.getElementById( 'spd-donut-holder' ).innerHTML = donut[ btn.dataset.donutTab ];
			} );
		} );
		bindQuickActions();
	}

	function bindQuickActions() {
		var newProjectBtn = root.querySelector( '[data-action="new-project"]' );
		if ( newProjectBtn ) { newProjectBtn.addEventListener( 'click', function () { openProjectForm(); } ); }
		var newCharBtn = root.querySelector( '[data-action="new-character"]' );
		if ( newCharBtn ) { newCharBtn.addEventListener( 'click', function () { openCharacterForm(); } ); }
		var newFranBtn = root.querySelector( '[data-action="new-franchise"]' );
		if ( newFranBtn ) { newFranBtn.addEventListener( 'click', function () { openFranchiseForm(); } ); }
	}

	/* ---------------------------------------------------------------- */
	/* Projects                                                          */
	/* ---------------------------------------------------------------- */

	function renderProjects() {
		shell( '<div class="spd-empty">Loading projects…</div>' );
		Promise.all( [ loadProjects(), loadFranchises() ] ).then( function ( results ) {
			paintProjects( results[0], results[1] );
		} );
	}

	function paintProjects( projects, franchises, filterText ) {
		filterText = ( filterText || '' ).toLowerCase();
		var visible = projects.filter( function ( p ) {
			return ! filterText || p.title.toLowerCase().indexOf( filterText ) !== -1 ||
				p.genres.join( ' ' ).toLowerCase().indexOf( filterText ) !== -1;
		} );

		var franchiseById = {};
		franchises.forEach( function ( f ) { franchiseById[ f.id ] = f; } );

		var cardsHtml = visible.length ? visible.map( function ( p ) {
			return '<div class="spd-item-card" data-project-id="' + p.id + '">' +
				'<div class="spd-item-top"><div class="spd-item-icon-row"><div class="spd-item-icon">' + ( TYPE_ICON[ p.type ] || '📁' ) + '</div>' +
				'<span class="spd-pill">' + esc( titleCase( p.type ) ) + '</span></div>' +
				'<span class="spd-pill spd-pill-strong">' + esc( titleCase( p.stage ) ) + '</span></div>' +
				'<div class="spd-item-name">' + esc( p.title ) + '</div>' +
				'<div class="spd-item-desc">' + esc( p.logline || 'No logline yet.' ) + '</div>' +
				'<div class="spd-progress-row"><span>Progress</span><span>' + p.progress + '%</span></div>' +
				'<div class="spd-progress-track"><div class="spd-progress-fill" style="width:' + p.progress + '%"></div></div>' +
				'<div class="spd-tags" style="margin-top:12px">' + p.genres.map( function ( g ) { return '<span class="spd-tag">' + esc( g ) + '</span>'; } ).join( '' ) + '</div>' +
				( franchiseById[ p.franchise_id ] ? '<div class="spd-item-meta-row"><span>' + esc( franchiseById[ p.franchise_id ].title ) + '</span><span>' + p.date + '</span></div>' : '<div class="spd-item-meta-row"><span></span><span>' + p.date + '</span></div>' ) +
				'<div class="spd-item-card-actions"><button class="spd-btn spd-btn-sm" data-edit-project="' + p.id + '">Edit</button>' +
				'<button class="spd-btn spd-btn-sm" data-beatsheet-project="' + p.id + '">Beat Sheet</button>' +
				'<button class="spd-btn spd-btn-sm spd-btn-danger" data-delete-project="' + p.id + '">Delete</button></div>' +
			'</div>';
		} ).join( '' ) : '<div class="spd-empty">No projects match your search yet.</div>';

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Project Database</h1><p class="spd-subtitle">' + projects.length + ' projects in your library</p></div>' +
			'<button class="spd-btn spd-btn-primary" data-action="new-project">+ Add Project</button></div>' +
			'<div class="spd-toolbar"><input class="spd-input spd-search" id="spd-project-search" placeholder="Search projects…" value="' + esc( filterText ) + '"></div>' +
			'<div class="spd-card-list">' + cardsHtml + '</div>'
		);

		bindQuickActions();

		var search = document.getElementById( 'spd-project-search' );
		search.addEventListener( 'input', function () { paintProjects( projects, franchises, search.value ); } );
		search.focus();
		search.selectionStart = search.selectionEnd = search.value.length;

		root.querySelectorAll( '[data-edit-project]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				var p = projects.find( function ( x ) { return x.id == btn.dataset.editProject; } );
				openProjectForm( p );
			} );
		} );
		root.querySelectorAll( '[data-beatsheet-project]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { location.hash = '#/beatsheet?project=' + btn.dataset.beatsheetProject; } );
		} );
		root.querySelectorAll( '[data-delete-project]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				if ( ! confirm( 'Delete this project? This cannot be undone.' ) ) { return; }
				api( 'projects/' + btn.dataset.deleteProject, { method: 'DELETE' } ).then( function () {
					toast( 'Project deleted.' );
					loadProjects( true ).then( function ( fresh ) { paintProjects( fresh, franchises, filterText ); } );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	function openProjectForm( project, prefillTitle ) {
		loadFranchises().then( function ( franchises ) {
			var franchiseOptions = '<option value="0">— None —</option>' + selectOptions( franchises.map( function ( f ) { return { value: f.id, label: f.title }; } ), project ? project.franchise_id : '', function ( v ) { return v.label; } );

			var body =
				'<div class="spd-field"><label>Title</label><input class="spd-input" name="title" required value="' + esc( project ? project.title : ( prefillTitle || '' ) ) + '"></div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Type</label><select class="spd-select" name="type">' + selectOptions( PROJECT_TYPES, project ? project.type : 'feature' ) + '</select></div>' +
					'<div class="spd-field"><label>Stage</label><select class="spd-select" name="stage">' + selectOptions( PROJECT_STAGES, project ? project.stage : 'idea' ) + '</select></div>' +
				'</div>' +
				'<div class="spd-field"><label>Logline</label><textarea class="spd-input" name="logline" rows="2">' + esc( project ? project.logline : '' ) + '</textarea></div>' +
				'<div class="spd-field"><label>Synopsis</label><textarea class="spd-input" name="synopsis" rows="3">' + esc( project ? project.synopsis : '' ) + '</textarea></div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Progress (%)</label><input class="spd-input" type="number" min="0" max="100" name="progress" value="' + ( project ? project.progress : 0 ) + '"></div>' +
					'<div class="spd-field"><label>Franchise</label><select class="spd-select" name="franchise_id">' + franchiseOptions + '</select></div>' +
				'</div>' +
				'<div class="spd-field"><label>Genres (comma separated)</label><input class="spd-input" name="genres" value="' + esc( project ? project.genres.join( ', ' ) : '' ) + '"></div>';

			openModal( project ? 'Edit Project' : 'New Project', body, function ( fd, close ) {
				var payload = {
					title: fd.get( 'title' ), type: fd.get( 'type' ), stage: fd.get( 'stage' ),
					logline: fd.get( 'logline' ), synopsis: fd.get( 'synopsis' ),
					progress: fd.get( 'progress' ), franchise_id: fd.get( 'franchise_id' ),
					genres: fd.get( 'genres' ).split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean )
				};
				var req = project ? api( 'projects/' + project.id, { method: 'PUT', body: payload } ) : api( 'projects', { method: 'POST', body: payload } );
				req.then( function () {
					toast( project ? 'Project updated.' : 'Project created.' );
					close();
					loadProjects( true ).then( function () { if ( currentRoute() === 'projects' ) { renderProjects(); } else { renderDashboard(); } } );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Franchises                                                        */
	/* ---------------------------------------------------------------- */

	function renderFranchises() {
		shell( '<div class="spd-empty">Loading franchises…</div>' );
		loadFranchises().then( paintFranchises );
	}

	function paintFranchises( franchises ) {
		var cardsHtml = franchises.length ? franchises.map( function ( f ) {
			var linked = f.projects.map( function ( p ) {
				return '<div class="spd-linked-row"><span>' + ( TYPE_ICON[ p.type ] || '📁' ) + ' ' + esc( p.title ) + '</span><span class="spd-pill spd-pill-strong">' + esc( titleCase( p.stage ) ) + '</span></div>';
			} ).join( '' );

			return '<div class="spd-item-card">' +
				'<div class="spd-item-top"><div class="spd-item-icon-row"><div class="spd-item-icon">🔀</div><div class="spd-item-name" style="margin:0">' + esc( f.title ) + '</div></div>' +
				'<span class="spd-pill spd-pill-strong">' + esc( titleCase( f.status ) ) + '</span></div>' +
				'<div class="spd-item-desc">' + esc( f.description || '' ) + '</div>' +
				'<div class="spd-tags">' + f.genres.map( function ( g ) { return '<span class="spd-tag">' + esc( g ) + '</span>'; } ).join( '' ) + '</div>' +
				( linked ? '<div class="spd-linked-projects"><div class="spd-linked-label">Linked Projects</div>' + linked + '</div>' : '' ) +
				'<div class="spd-item-card-actions"><button class="spd-btn spd-btn-sm" data-edit-franchise="' + f.id + '">Edit</button>' +
				'<button class="spd-btn spd-btn-sm spd-btn-danger" data-delete-franchise="' + f.id + '">Delete</button></div>' +
			'</div>';
		} ).join( '' ) : '<div class="spd-empty">No franchises yet.</div>';

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Franchise Database</h1><p class="spd-subtitle">Manage your IP universes and connected project ecosystems.</p></div>' +
			'<button class="spd-btn spd-btn-primary" data-action="new-franchise">+ New Franchise</button></div>' +
			'<div class="spd-card-list">' + cardsHtml + '</div>'
		);

		bindQuickActions();
		root.querySelectorAll( '[data-edit-franchise]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				var f = franchises.find( function ( x ) { return x.id == btn.dataset.editFranchise; } );
				openFranchiseForm( f );
			} );
		} );
		root.querySelectorAll( '[data-delete-franchise]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				if ( ! confirm( 'Delete this franchise?' ) ) { return; }
				api( 'franchises/' + btn.dataset.deleteFranchise, { method: 'DELETE' } ).then( function () {
					toast( 'Franchise deleted.' );
					loadFranchises( true ).then( paintFranchises );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	function openFranchiseForm( franchise ) {
		var body =
			'<div class="spd-field"><label>Title</label><input class="spd-input" name="title" required value="' + esc( franchise ? franchise.title : '' ) + '"></div>' +
			'<div class="spd-field"><label>Status</label><select class="spd-select" name="status">' + selectOptions( FRANCHISE_STATUSES, franchise ? franchise.status : 'development' ) + '</select></div>' +
			'<div class="spd-field"><label>Description</label><textarea class="spd-input" name="description" rows="3">' + esc( franchise ? franchise.description : '' ) + '</textarea></div>' +
			'<div class="spd-field"><label>Genres (comma separated)</label><input class="spd-input" name="genres" value="' + esc( franchise ? franchise.genres.join( ', ' ) : '' ) + '"></div>';

		openModal( franchise ? 'Edit Franchise' : 'New Franchise', body, function ( fd, close ) {
			var payload = {
				title: fd.get( 'title' ), status: fd.get( 'status' ), description: fd.get( 'description' ),
				genres: fd.get( 'genres' ).split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean )
			};
			var req = franchise ? api( 'franchises/' + franchise.id, { method: 'PUT', body: payload } ) : api( 'franchises', { method: 'POST', body: payload } );
			req.then( function () {
				toast( franchise ? 'Franchise updated.' : 'Franchise created.' );
				close();
				loadFranchises( true ).then( function () { if ( currentRoute() === 'franchises' ) { paintFranchises( cache.franchises ); } else { renderDashboard(); } } );
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Characters                                                        */
	/* ---------------------------------------------------------------- */

	function renderCharacters() {
		shell( '<div class="spd-empty">Loading characters…</div>' );
		loadCharacters().then( paintCharacters );
	}

	function paintCharacters( characters, filterText ) {
		filterText = ( filterText || '' ).toLowerCase();
		var visible = characters.filter( function ( c ) { return ! filterText || c.name.toLowerCase().indexOf( filterText ) !== -1; } );

		var cardsHtml = visible.length ? visible.map( function ( c ) {
			return '<div class="spd-item-card">' +
				'<div class="spd-item-top"><div class="spd-item-icon-row"><div class="spd-avatar">' + esc( initials( c.name ) ) + '</div>' +
				'<div><div class="spd-item-name" style="margin:0">' + esc( c.name ) + '</div>' +
				'<span class="spd-pill ' + ( c.role === 'antagonist' ? 'spd-pill-strong' : '' ) + '">' + esc( titleCase( c.role ) ) + '</span></div></div></div>' +
				( c.project_name ? '<div class="spd-item-desc">' + esc( c.project_name ) + '</div>' : '' ) +
				'<div class="spd-item-desc">' + esc( c.arc || '' ) + '</div>' +
				'<div class="spd-tags">' + c.traits.map( function ( t ) { return '<span class="spd-tag">' + esc( t ) + '</span>'; } ).join( '' ) + '</div>' +
				'<div class="spd-item-card-actions"><button class="spd-btn spd-btn-sm" data-edit-character="' + c.id + '">Edit</button>' +
				'<button class="spd-btn spd-btn-sm spd-btn-danger" data-delete-character="' + c.id + '">Delete</button></div>' +
			'</div>';
		} ).join( '' ) : '<div class="spd-empty">No characters match yet.</div>';

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Character Database</h1><p class="spd-subtitle">' + characters.length + ' characters across all projects</p></div>' +
			'<button class="spd-btn spd-btn-primary" data-action="new-character">+ New Character</button></div>' +
			'<div class="spd-toolbar"><input class="spd-input spd-search" id="spd-char-search" placeholder="Search characters…" value="' + esc( filterText ) + '"></div>' +
			'<div class="spd-card-list">' + cardsHtml + '</div>'
		);

		bindQuickActions();
		var search = document.getElementById( 'spd-char-search' );
		search.addEventListener( 'input', function () { paintCharacters( characters, search.value ); } );

		root.querySelectorAll( '[data-edit-character]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				var c = characters.find( function ( x ) { return x.id == btn.dataset.editCharacter; } );
				openCharacterForm( c );
			} );
		} );
		root.querySelectorAll( '[data-delete-character]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				if ( ! confirm( 'Delete this character?' ) ) { return; }
				api( 'characters/' + btn.dataset.deleteCharacter, { method: 'DELETE' } ).then( function () {
					toast( 'Character deleted.' );
					loadCharacters( true ).then( paintCharacters );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	function openCharacterForm( character ) {
		loadProjects().then( function ( projects ) {
			var projectOptions = '<option value="0">— Unassigned —</option>' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), character ? character.project_id : '', function ( v ) { return v.label; } );

			var body =
				'<div class="spd-field"><label>Name</label><input class="spd-input" name="title" required value="' + esc( character ? character.name : '' ) + '"></div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Role</label><select class="spd-select" name="role">' + selectOptions( CHARACTER_ROLES, character ? character.role : 'protagonist' ) + '</select></div>' +
					'<div class="spd-field"><label>Project</label><select class="spd-select" name="project_id">' + projectOptions + '</select></div>' +
				'</div>' +
				'<div class="spd-field"><label>Arc</label><textarea class="spd-input" name="arc" rows="2">' + esc( character ? character.arc : '' ) + '</textarea></div>' +
				'<div class="spd-field"><label>Traits (comma separated)</label><input class="spd-input" name="traits" value="' + esc( character ? character.traits.join( ', ' ) : '' ) + '"></div>';

			openModal( character ? 'Edit Character' : 'New Character', body, function ( fd, close ) {
				var payload = {
					title: fd.get( 'title' ), role: fd.get( 'role' ), project_id: fd.get( 'project_id' ), arc: fd.get( 'arc' ),
					traits: fd.get( 'traits' ).split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean )
				};
				var req = character ? api( 'characters/' + character.id, { method: 'PUT', body: payload } ) : api( 'characters', { method: 'POST', body: payload } );
				req.then( function () {
					toast( character ? 'Character updated.' : 'Character created.' );
					close();
					loadCharacters( true ).then( function () { if ( currentRoute() === 'characters' ) { paintCharacters( cache.characters ); } else { renderDashboard(); } } );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Beat sheet calculator                                             */
	/* ---------------------------------------------------------------- */

	function renderBeatsheet() {
		shell( '<div class="spd-empty">Loading…</div>' );
		var params = new URLSearchParams( ( location.hash.split( '?' )[1] || '' ) );
		var preselect = params.get( 'project' );

		Promise.all( [ loadProjects(), loadBeatTemplates() ] ).then( function ( results ) {
			paintBeatsheet( results[0], results[1], preselect );
		} );
	}

	function paintBeatsheet( projects, templates, selectedId, beatsData ) {
		if ( ! projects.length ) {
			shell( '<div class="spd-header"><div><h1 class="spd-title">Beat Sheet Calculator</h1></div></div><div class="spd-empty">Create a project first to generate a beat sheet.</div>' );
			return;
		}
		selectedId = selectedId || projects[0].id;
		var project = projects.find( function ( p ) { return p.id == selectedId; } ) || projects[0];

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Beat Sheet Calculator</h1><p class="spd-subtitle">Generate structure-perfect beat sheets for any format.</p></div></div>' +
			'<div class="spd-panel">' +
				'<div class="spd-field"><label>Project</label><select class="spd-select" id="spd-bs-project">' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), selectedId, function ( v ) { return v.label; } ) + '</select></div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Total Pages</label><input class="spd-input" type="number" min="1" id="spd-bs-pages" value="' + ( project.total_pages || 100 ) + '"></div>' +
					'<div class="spd-field"><label>Template</label><select class="spd-select" id="spd-bs-template">' + selectOptions( templates.map( function ( t ) { return { value: t.key, label: t.label }; } ), project.beat_template ) + '</select></div>' +
				'</div>' +
				'<button class="spd-btn spd-btn-primary" id="spd-bs-generate">Generate Beat Pages</button>' +
			'</div>' +
			'<div id="spd-bs-results"></div>'
		);

		function paintBeats( beats ) {
			var holder = document.getElementById( 'spd-bs-results' );
			if ( ! beats || ! beats.length ) { holder.innerHTML = ''; return; }
			holder.innerHTML = '<div class="spd-panel"><table class="spd-table"><thead><tr><th>Beat</th><th>Pg</th><th>Description</th></tr></thead><tbody>' +
				beats.map( function ( b ) { return '<tr><td>' + esc( b.beat ) + '</td><td class="spd-page">' + b.page + '</td><td>' + esc( b.description ) + '</td></tr>'; } ).join( '' ) +
				'</tbody></table></div>';
		}

		if ( beatsData && beatsData.length ) {
			paintBeats( beatsData );
		} else {
			api( 'projects/' + project.id + '/beatsheet' ).then( function ( d ) { paintBeats( d.beats ); } );
		}

		document.getElementById( 'spd-bs-project' ).addEventListener( 'change', function ( e ) {
			paintBeatsheet( projects, templates, e.target.value );
		} );

		document.getElementById( 'spd-bs-generate' ).addEventListener( 'click', function () {
			var pages = document.getElementById( 'spd-bs-pages' ).value;
			var template = document.getElementById( 'spd-bs-template' ).value;
			api( 'projects/' + project.id + '/beatsheet', { method: 'POST', body: { total_pages: pages, template: template } } ).then( function ( d ) {
				toast( 'Beat sheet generated.' );
				paintBeats( d.beats );
				loadProjects( true );
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Imports / Exports                                                 */
	/* ---------------------------------------------------------------- */

	var IMPORT_CATEGORIES = [
		{ key: 'script', label: 'Script', hint: '.fdx, .pdf, .docx' },
		{ key: 'treatment', label: 'Treatment / Outline', hint: '.docx, .pdf' },
		{ key: 'beat_sheet', label: 'Beat Sheet', hint: '.xlsx, .csv' },
		{ key: 'poster', label: 'Film Poster', hint: '.jpg, .png, .svg' },
		{ key: 'research', label: 'Research Documents', hint: '.pdf, .docx' }
	];

	function renderImports() {
		shell( '<div class="spd-empty">Loading…</div>' );
		loadProjects().then( function ( projects ) { paintImports( projects, projects[0] ? projects[0].id : null ); } );
	}

	function paintImports( projects, selectedId ) {
		if ( ! projects.length ) {
			shell( '<div class="spd-header"><div><h1 class="spd-title">Imports &amp; Exports</h1></div></div><div class="spd-empty">Create a project first.</div>' );
			return;
		}

		var rowsHtml = IMPORT_CATEGORIES.map( function ( c ) {
			return '<div class="spd-import-row"><div class="spd-import-row-left"><strong>' + esc( c.label ) + '</strong><span style="color:var(--text-faint);font-size:12px">' + c.hint + '</span></div>' +
				'<button class="spd-btn spd-btn-sm" data-upload-cat="' + c.key + '">⇧ Upload</button></div>';
		} ).join( '' );

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Imports &amp; Exports</h1><p class="spd-subtitle">Bring in your existing work and export polished materials.</p></div></div>' +
			'<div class="spd-panel">' +
				'<div class="spd-field"><label>Project</label><select class="spd-select" id="spd-import-project">' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), selectedId, function ( v ) { return v.label; } ) + '</select></div>' +
				rowsHtml +
				'<input type="file" id="spd-file-input" style="display:none">' +
			'</div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Existing Imports</div><div id="spd-imports-list"></div></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Export Materials</div>' +
				'<div class="spd-field"><label>Select Project</label><select class="spd-select" id="spd-export-project">' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), selectedId, function ( v ) { return v.label; } ) + '</select></div>' +
				'<button class="spd-btn spd-btn-primary" id="spd-export-btn">⇩ Export One-Sheet (PDF)</button>' +
			'</div>'
		);

		var projectSelect = document.getElementById( 'spd-import-project' );
		var fileInput = document.getElementById( 'spd-file-input' );
		var pendingCategory = null;

		function refreshImportsList() {
			var pid = projectSelect.value;
			api( 'projects/' + pid + '/imports' ).then( function ( items ) {
				var holder = document.getElementById( 'spd-imports-list' );
				if ( ! items.length ) { holder.innerHTML = '<div class="spd-empty">No files imported for this project yet.</div>'; return; }
				holder.innerHTML = items.map( function ( it ) {
					return '<div class="spd-import-row"><div class="spd-import-row-left"><span class="spd-pill">' + esc( titleCase( it.category ) ) + '</span>' +
						'<a href="' + esc( it.url ) + '" target="_blank" rel="noopener">' + esc( it.title ) + '</a></div>' +
						'<button class="spd-btn spd-btn-sm spd-btn-danger" data-delete-import="' + it.id + '">Remove</button></div>';
				} ).join( '' );
				holder.querySelectorAll( '[data-delete-import]' ).forEach( function ( btn ) {
					btn.addEventListener( 'click', function () {
						api( 'imports/' + btn.dataset.deleteImport, { method: 'DELETE' } ).then( function () { toast( 'File removed.' ); refreshImportsList(); } );
					} );
				} );
			} );
		}
		refreshImportsList();

		projectSelect.addEventListener( 'change', refreshImportsList );

		root.querySelectorAll( '[data-upload-cat]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { pendingCategory = btn.dataset.uploadCat; fileInput.click(); } );
		} );

		fileInput.addEventListener( 'change', function () {
			if ( ! fileInput.files.length ) { return; }
			var fd = new FormData();
			fd.append( 'file', fileInput.files[0] );
			fd.append( 'category', pendingCategory );
			api( 'projects/' + projectSelect.value + '/imports', { method: 'POST', body: fd } ).then( function () {
				toast( 'File uploaded.' );
				fileInput.value = '';
				refreshImportsList();
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );

		document.getElementById( 'spd-export-btn' ).addEventListener( 'click', function () {
			var pid = document.getElementById( 'spd-export-project' ).value;
			var url = SPD.adminUrl + 'admin-post.php?action=spd_export_onesheet&project_id=' + pid + '&_wpnonce=' + SPD.exportNonce;
			window.open( url, '_blank' );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Billing (display only)                                            */
	/* ---------------------------------------------------------------- */

	function renderBilling() {
		shell( '<div class="spd-empty">Loading…</div>' );
		api( 'billing' ).then( function ( d ) {
			var current = d.plans.find( function ( p ) { return p.id === d.current_plan; } );
			var other = d.plans.find( function ( p ) { return p.id !== d.current_plan; } );

			shell(
				'<div class="spd-header"><div><h1 class="spd-title">Billing</h1><p class="spd-subtitle">Manage your subscription and plan.</p></div></div>' +
				'<div class="spd-panel"><div class="spd-plan-card"><div><div style="color:var(--text-dim);font-size:12px">Current Plan</div>' +
					'<div style="font-size:20px;font-weight:700;margin:4px 0">' + esc( current.name ) + '</div>' +
					'<ul class="spd-plan-features">' + current.features.map( function ( f ) { return '<li>' + esc( f ) + '</li>'; } ).join( '' ) + '</ul></div>' +
					'<button class="spd-btn spd-btn-primary" id="spd-upgrade-btn">Upgrade Plan</button></div></div>' +
				( other ? '<div class="spd-panel"><div class="spd-plan-card"><div><div style="font-size:16px;font-weight:700">Upgrade to ' + esc( other.name ) + ' — $' + other.price + esc( other.period ) + '</div>' +
					'<div style="color:var(--text-dim);font-size:13px;margin-top:6px">' + other.features.join( ' · ' ) + '</div></div>' +
					'<button class="spd-btn" id="spd-see-plans-btn">See Plans</button></div></div>' : '' ) +
				'<div class="spd-panel"><div class="spd-panel-title">Payment Method</div><div class="spd-empty" style="padding:10px 0;text-align:left">No payment method on file.</div></div>'
			);

			[ 'spd-upgrade-btn', 'spd-see-plans-btn' ].forEach( function ( id ) {
				var btn = document.getElementById( id );
				if ( btn ) { btn.addEventListener( 'click', function () { toast( 'Billing is display-only in this build — no payment processing is connected.' ); } ); }
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Creator Profile                                                   */
	/* ---------------------------------------------------------------- */

	function renderProfile() {
		shell( '<div class="spd-empty">Loading…</div>' );
		api( 'profile' ).then( paintProfile );
	}

	function paintProfile( profile, editing ) {
		var view =
			'<div class="spd-panel"><div class="spd-item-icon-row"><div class="spd-avatar" style="width:56px;height:56px;font-size:18px">' + esc( initials( profile.name ) ) + '</div>' +
			'<div><div style="font-size:20px;font-weight:700">' + esc( profile.name || 'Add your name' ) + '</div>' +
			'<div style="color:var(--text-dim)">' + esc( profile.title ) + '</div>' +
			'<div style="color:var(--text-faint);font-size:12.5px">' + esc( [ profile.company, profile.location ].filter( Boolean ).join( ' · ' ) ) + '</div></div></div>' +
			'<div style="margin-top:16px;font-size:13px;color:var(--text-dim)">' +
			( profile.email ? '<div>✉ ' + esc( profile.email ) + '</div>' : '' ) +
			( profile.website ? '<div>🌐 ' + esc( profile.website ) + '</div>' : '' ) +
			( profile.linkedin ? '<div>in ' + esc( profile.linkedin ) + '</div>' : '' ) + '</div></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Professional Summary</div>' +
			'<div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;margin-bottom:6px">Professional Bio</div><div style="margin-bottom:16px">' + esc( profile.bio || '—' ) + '</div>' +
			'<div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;margin-bottom:6px">Short Bio</div><div style="margin-bottom:16px">' + esc( profile.short_bio || '—' ) + '</div>' +
			'<div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;margin-bottom:6px">Creative Statement</div><div>' + esc( profile.creative_statement || '—' ) + '</div></div>' +
			( profile.expertise.length ? '<div class="spd-panel"><div class="spd-panel-title">Areas of Expertise</div><div class="spd-tags">' + profile.expertise.map( function ( e ) { return '<span class="spd-tag">' + esc( e ) + '</span>'; } ).join( '' ) + '</div></div>' : '' );

		var form =
			'<div class="spd-panel"><div class="spd-field-row"><div class="spd-field"><label>Name</label><input class="spd-input" id="pf-name" value="' + esc( profile.name ) + '"></div>' +
			'<div class="spd-field"><label>Title</label><input class="spd-input" id="pf-title" value="' + esc( profile.title ) + '"></div></div>' +
			'<div class="spd-field-row"><div class="spd-field"><label>Company</label><input class="spd-input" id="pf-company" value="' + esc( profile.company ) + '"></div>' +
			'<div class="spd-field"><label>Location</label><input class="spd-input" id="pf-location" value="' + esc( profile.location ) + '"></div></div>' +
			'<div class="spd-field-row"><div class="spd-field"><label>Email</label><input class="spd-input" id="pf-email" value="' + esc( profile.email ) + '"></div>' +
			'<div class="spd-field"><label>Website</label><input class="spd-input" id="pf-website" value="' + esc( profile.website ) + '"></div></div>' +
			'<div class="spd-field"><label>LinkedIn</label><input class="spd-input" id="pf-linkedin" value="' + esc( profile.linkedin ) + '"></div></div>' +
			'<div class="spd-panel"><div class="spd-field"><label>Professional Bio</label><textarea class="spd-input" id="pf-bio" rows="4">' + esc( profile.bio ) + '</textarea></div>' +
			'<div class="spd-field"><label>Short Bio</label><textarea class="spd-input" id="pf-short-bio" rows="2">' + esc( profile.short_bio ) + '</textarea></div>' +
			'<div class="spd-field"><label>Creative Statement</label><textarea class="spd-input" id="pf-statement" rows="2">' + esc( profile.creative_statement ) + '</textarea></div>' +
			'<div class="spd-field"><label>Areas of Expertise (comma separated)</label><input class="spd-input" id="pf-expertise" value="' + esc( profile.expertise.join( ', ' ) ) + '"></div></div>' +
			'<button class="spd-btn spd-btn-primary" id="pf-save">Save Profile</button> <button class="spd-btn" id="pf-cancel">Cancel</button>';

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Creator Profile</h1><p class="spd-subtitle">Build your professional creative identity.</p></div>' +
			( editing ? '' : '<button class="spd-btn" id="pf-edit">Edit Profile</button>' ) + '</div>' +
			( editing ? form : view )
		);

		if ( editing ) {
			document.getElementById( 'pf-cancel' ).addEventListener( 'click', function () { paintProfile( profile, false ); } );
			document.getElementById( 'pf-save' ).addEventListener( 'click', function () {
				var payload = {
					name: val( 'pf-name' ), title: val( 'pf-title' ), company: val( 'pf-company' ), location: val( 'pf-location' ),
					email: val( 'pf-email' ), website: val( 'pf-website' ), linkedin: val( 'pf-linkedin' ),
					bio: val( 'pf-bio' ), short_bio: val( 'pf-short-bio' ), creative_statement: val( 'pf-statement' ),
					expertise: val( 'pf-expertise' ).split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean )
				};
				api( 'profile', { method: 'PUT', body: payload } ).then( function ( updated ) {
					toast( 'Profile saved.' );
					paintProfile( updated, false );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} else {
			var editBtn = document.getElementById( 'pf-edit' );
			if ( editBtn ) { editBtn.addEventListener( 'click', function () { paintProfile( profile, true ); } ); }
		}

		function val( id ) { return document.getElementById( id ).value; }
	}

	/* ---------------------------------------------------------------- */
	/* Router                                                            */
	/* ---------------------------------------------------------------- */

	var ROUTES = {
		dashboard: renderDashboard,
		projects: renderProjects,
		franchises: renderFranchises,
		characters: renderCharacters,
		beatsheet: renderBeatsheet,
		imports: renderImports,
		billing: renderBilling,
		profile: renderProfile
	};

	function route() {
		var name = currentRoute();
		( ROUTES[ name ] || renderDashboard )();
	}

	window.addEventListener( 'hashchange', route );
	route();

	/* Arriving from the homepage's "Start in the demo" field: open the New
	   Project modal pre-filled with whatever title they typed there. */
	var startTitle = new URLSearchParams( location.search ).get( 'start_title' );
	if ( startTitle ) {
		setTimeout( function () { openProjectForm( null, startTitle ); }, 300 );
	}
})();
