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

	// Same five hues as the Figma source's --chart-1..5 tokens.
	var PALETTE = [ '#6366f1', '#D4A96A', '#22d3ee', '#ef4444', '#a78bfa', '#f59e0b', '#34d399', '#f472b6' ];

	/* ---------------------------------------------------------------- */
	/* Static option lists                                               */
	/* ---------------------------------------------------------------- */

	var PROJECT_TYPES = [ 'feature', 'tv_series', 'novel', 'game', 'short', 'other' ];
	var PROJECT_STAGES = [ 'idea', 'outline', 'treatment', 'script', 'pitch', 'complete' ];
	var CHARACTER_ROLES = [ 'protagonist', 'antagonist', 'mentor', 'love_interest', 'supporting' ];
	var FRANCHISE_STATUSES = [ 'development', 'active', 'paused', 'complete' ];

	var TYPE_ICON = { feature: '🎬', tv_series: '📺', novel: '📖', game: '🎮', short: '🎞️', other: '📁' };

	function stagePillClass( stage ) { return 'spd-pill spd-pill-status-' + ( stage || 'idea' ); }
	function rolePillClass( role ) { return 'spd-pill spd-pill-role-' + ( role || 'supporting' ); }

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
		return ( location.hash || '#/dashboard' ).replace( '#/', '' ).split( '?' )[0] || 'dashboard';
	}
	function currentParams() {
		return new URLSearchParams( ( location.hash.split( '?' )[1] || '' ) );
	}

	function shell( innerHtml ) {
		var route = currentRoute();
		var current = NAV_ITEMS.filter( function ( item ) { return item.route === route; } )[0] || NAV_ITEMS[0];
		var navHtml = NAV_ITEMS.map( function ( item ) {
			return '<a href="#/' + item.route + '" class="' + ( item.route === route ? 'active' : '' ) + '">' +
				'<span class="spd-icon">' + item.icon + '</span>' + esc( item.label ) + '</a>';
		} ).join( '' );

		root.innerHTML =
			'<div class="spd-mobile-topbar">' +
				'<button type="button" class="spd-menu-btn" aria-label="Open navigation" aria-expanded="false"><span class="spd-icon">☰</span></button>' +
				'<span class="spd-mobile-topbar-title">' + esc( current.label ) + '</span>' +
			'</div>' +
			'<div class="spd-sidebar-backdrop"></div>' +
			'<div class="spd-sidebar" id="spd-sidebar">' +
				'<div class="spd-brand"><div class="spd-brand-icon">🎬</div><div><div class="spd-brand-title">Project Database</div><div class="spd-brand-sub">for Storytellers</div></div></div>' +
				( SPD.backUrl ? '<a class="spd-back-link" href="' + esc( SPD.backUrl ) + '">← ' + esc( SPD.backLabel || 'Back' ) + '</a>' : '' ) +
				'<div class="spd-nav">' + navHtml +
					'<div class="spd-nav-soon"><span class="spd-icon">✨</span><span class="label">AI Chat</span><span class="spd-badge-soon">Soon</span></div>' +
				'</div>' +
				'<div class="spd-sidebar-footer"><div class="spd-avatar">' + esc( initials( SPD.userDisplayName ) ) + '</div>' +
				'<div><div class="spd-sidebar-footer-name">' + esc( SPD.userDisplayName ) + '</div><div class="spd-sidebar-footer-role">Screenwriter</div></div>' +
				'<span class="spd-logout" title="Log out">⏻</span></div>' +
			'</div>' +
			'<div class="spd-main">' + innerHtml + '</div>';

		bindMobileNav();
	}

	function closeMobileNav() {
		var sidebar = document.getElementById( 'spd-sidebar' );
		var backdrop = root.querySelector( '.spd-sidebar-backdrop' );
		var menuBtn = root.querySelector( '.spd-menu-btn' );
		if ( sidebar ) { sidebar.classList.remove( 'is-open' ); }
		if ( backdrop ) { backdrop.classList.remove( 'is-open' ); }
		if ( menuBtn ) { menuBtn.setAttribute( 'aria-expanded', 'false' ); }
	}

	/* Mobile only: the sidebar becomes an off-canvas drawer, opened via the
	   hamburger button in the mobile top bar and closed by the backdrop, the
	   Escape key, or picking a nav item (so navigating always collapses it).
	   Bound fresh each render since the shell's elements are recreated, but
	   the Escape handler is attached once at the bottom of this file (a
	   per-render document listener would stack up across route changes). */
	function bindMobileNav() {
		var sidebar = document.getElementById( 'spd-sidebar' );
		var menuBtn = root.querySelector( '.spd-menu-btn' );
		var backdrop = root.querySelector( '.spd-sidebar-backdrop' );

		if ( menuBtn ) {
			menuBtn.addEventListener( 'click', function () {
				if ( sidebar.classList.contains( 'is-open' ) ) {
					closeMobileNav();
				} else {
					sidebar.classList.add( 'is-open' );
					backdrop.classList.add( 'is-open' );
					menuBtn.setAttribute( 'aria-expanded', 'true' );
				}
			} );
		}
		backdrop.addEventListener( 'click', closeMobileNav );
		sidebar.querySelectorAll( '.spd-nav a' ).forEach( function ( a ) {
			a.addEventListener( 'click', closeMobileNav );
		} );
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

		// Appended to root (#spd-app), not document.body: every color in this
		// app is a CSS custom property defined on .spd-app itself, and those
		// don't inherit to a sibling outside it — the modal would render with
		// a fully transparent background otherwise.
		root.appendChild( backdrop );

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
	/* Pricing modal — shared across Billing, Workspace, and Profile      */
	/* ---------------------------------------------------------------- */

	function openPricingModal() {
		var backdrop = document.createElement( 'div' );
		backdrop.className = 'spd-pricing-backdrop';
		backdrop.innerHTML = '<div class="spd-pricing-modal"><div class="spd-empty">Loading plans…</div></div>';
		root.appendChild( backdrop );

		function close() { backdrop.remove(); }
		backdrop.addEventListener( 'click', function ( e ) { if ( e.target === backdrop ) { close(); } } );

		api( 'billing' ).then( function ( d ) { paint( d.plans, 'monthly' ); } );

		function paint( plans, billing ) {
			var annual = billing === 'annual';
			var tiersHtml = plans.map( function ( tier ) {
				var highlight = tier.ribbon === 'Most Popular';
				var priceHtml;
				if ( ! tier.price ) {
					priceHtml = '<div class="amount">Free</div>';
				} else if ( annual && tier.price_annual ) {
					var full = tier.price * 12;
					priceHtml = '<div><span class="amount">$' + tier.price_annual + '</span><span class="period">/yr</span>' +
						'<div class="save">Save $' + ( full - tier.price_annual ) + '</div></div>';
				} else {
					priceHtml = '<div><span class="amount">$' + tier.price + '</span><span class="period">' + esc( tier.period ) + '</span></div>';
				}
				var featuresHtml = tier.features.map( function ( f ) {
					var isHeader = /,\s*plus:$/i.test( f );
					return '<li' + ( isHeader ? ' class="spd-feature-header"' : '' ) + '>' + esc( f ) + '</li>';
				} ).join( '' );

				return '<div class="spd-tier' + ( highlight ? ' spd-tier-highlight' : '' ) + '">' +
					( tier.ribbon ? '<div class="spd-tier-ribbon">' + esc( tier.ribbon ) + '</div>' : '' ) +
					'<div class="spd-tier-name">' + esc( tier.name ) + '</div>' +
					'<p class="spd-tier-tagline">"' + esc( tier.tagline ) + '"</p>' +
					'<div class="spd-tier-price">' + priceHtml + '</div>' +
					'<button type="button" class="spd-btn spd-tier-cta ' + ( highlight ? 'spd-btn-primary' : 'spd-btn-outline' ) + '" data-select-plan="' + esc( tier.id ) + '">' +
						( tier.price ? 'Upgrade to ' + esc( tier.name ) : 'Get Started' ) +
					'</button>' +
					'<div class="spd-tier-divider"></div>' +
					'<ul class="spd-tier-features">' + featuresHtml + '</ul>' +
				'</div>';
			} ).join( '' );

			backdrop.innerHTML =
				'<div class="spd-pricing-modal">' +
					'<button type="button" class="spd-pricing-close" data-close>✕</button>' +
					'<div class="spd-pricing-head">' +
						'<h2>Choose Your Creative Role</h2>' +
						'<p>Build projects, grow franchises, and manage your intellectual property from concept to universe.</p>' +
						'<div class="spd-billing-toggle">' +
							'<button type="button" data-billing="monthly" class="' + ( ! annual ? 'active' : '' ) + '">Monthly</button>' +
							'<button type="button" data-billing="annual" class="' + ( annual ? 'active' : '' ) + '">Annual <span class="spd-billing-save' + ( annual ? ' active' : '' ) + '">SAVE 20%</span></button>' +
						'</div>' +
					'</div>' +
					'<div class="spd-tier-grid">' + tiersHtml + '</div>' +
					'<div class="spd-pricing-why">' +
						'<div class="spd-pricing-why-label">Why Upgrade?</div>' +
						'<h3>Build More Than Projects</h3>' +
						'<div class="spd-capability-chips">' + [ 'Projects', 'Characters', 'Franchises', 'Worlds', 'Assets', 'Pitch Decks', 'Creative Portfolios' ]
							.map( function ( c ) { return '<span>' + c + '</span>'; } ).join( '' ) +
						'</div>' +
					'</div>' +
				'</div>';

			backdrop.querySelector( '[data-close]' ).addEventListener( 'click', close );
			backdrop.querySelectorAll( '[data-billing]' ).forEach( function ( btn ) {
				btn.addEventListener( 'click', function () { paint( plans, btn.dataset.billing ); } );
			} );
			backdrop.querySelectorAll( '[data-select-plan]' ).forEach( function ( btn ) {
				btn.addEventListener( 'click', function () {
					toast( 'Billing is display-only in this build — no payment processing is connected.' );
					close();
				} );
			} );
		}

		return backdrop;
	}

	/* ---------------------------------------------------------------- */
	/* Dashboard                                                         */
	/* ---------------------------------------------------------------- */

	function renderDashboard() {
		shell( '<div class="spd-empty">Loading dashboard…</div>' );

		Promise.all( [ api( 'dashboard' ), loadProjects(), loadFranchises() ] ).then( function ( results ) {
			var d = results[0], projects = results[1], franchises = results[2];
			var donut = renderDonut( d.genre_distribution, d.type_distribution );
			var recent = projects.slice( 0, 3 ).map( function ( p ) { return projectCardHtml( p, franchises ); } ).join( '' );

			shell(
				'<div class="spd-header">' +
					'<div><h1 class="spd-title">Good morning, ' + esc( d.creator_name || 'there' ) + '.</h1>' +
					'<p class="spd-subtitle">You have ' + d.total_projects + ' project' + ( d.total_projects === 1 ? '' : 's' ) + ' in your library.</p></div>' +
					'<div class="spd-header-actions"><button class="spd-btn spd-btn-primary" data-action="new-project">+ New Project</button></div>' +
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
				'</div>' +
				'<div>' +
					'<div class="spd-item-top" style="margin-bottom:14px"><h2 style="font-size:13px;font-weight:600;margin:0">Recent Projects</h2>' +
					'<a href="#/projects" style="font-size:12px;color:var(--accent);text-decoration:none">View all</a></div>' +
					'<div class="spd-grid">' + ( recent || '<div class="spd-empty">No projects yet.</div>' ) + '</div>' +
				'</div>'
			);

			bindDashboardEvents( donut );
			bindProjectCardLinks();
		} ).catch( function ( e ) { shell( '<div class="spd-empty">Failed to load dashboard: ' + esc( e.message ) + '</div>' ); } );
	}

	function statTile( label, value, icon ) {
		return '<div class="spd-stat"><div class="spd-stat-top"><span>' + esc( label ) + '</span><span>' + icon + '</span></div>' +
			'<div class="spd-stat-value">' + value + '</div></div>';
	}

	/* Donut with labels positioned around the ring by polar coordinates,
	   matching the Figma source's layout exactly (a total in the hole,
	   name + count/percent floating at each slice's mid-angle). */
	function renderDonut( genreDist, typeDist ) {
		function build( dist ) {
			if ( ! dist.length ) {
				return '<div class="spd-empty">No data yet.</div>';
			}
			var total = dist.reduce( function ( s, d ) { return s + d.count; }, 0 );
			var gradientParts = [];
			var acc = 0;
			var labels = dist.map( function ( row, i ) {
				var color = PALETTE[ i % PALETTE.length ];
				var start = acc;
				acc += row.percent;
				gradientParts.push( color + ' ' + start + '% ' + acc + '%' );
				var mid = start + row.percent / 2;
				var angleRad = ( ( mid * 3.6 - 90 ) * Math.PI ) / 180;
				var r = 132;
				var x = Math.cos( angleRad ) * r;
				var y = Math.sin( angleRad ) * r;
				return '<div class="spd-donut-label" style="left:calc(50% + ' + x.toFixed( 1 ) + 'px); top:calc(50% + ' + y.toFixed( 1 ) + 'px)">' +
					'<div class="spd-donut-label-dot-row"><span class="spd-donut-label-dot" style="background:' + color + '"></span>' +
					'<span class="spd-donut-label-name">' + esc( titleCase( row.label ) ) + '</span></div>' +
					'<div class="spd-donut-label-count">' + row.count + ' · ' + row.percent + '%</div>' +
				'</div>';
			} ).join( '' );
			var gradient = 'conic-gradient(' + gradientParts.join( ', ' ) + ')';
			return '<div class="spd-donut-wrap">' +
				'<div class="spd-donut" style="background:' + gradient + '"><div class="spd-donut-hole">' +
					'<span class="spd-donut-hole-value">' + total + '</span><span class="spd-donut-hole-label">total</span>' +
				'</div></div>' + labels +
			'</div>';
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
	/* Shared project card (Dashboard recent + Project Database grid)    */
	/* ---------------------------------------------------------------- */

	function projectCardHtml( p, franchises ) {
		var franchiseById = {};
		( franchises || [] ).forEach( function ( f ) { franchiseById[ f.id ] = f; } );
		return '<div class="spd-item-card" data-project-id="' + p.id + '" data-nav-workspace="' + p.id + '">' +
			'<div class="spd-item-top"><div class="spd-item-icon-row"><div class="spd-item-icon">' + ( TYPE_ICON[ p.type ] || '📁' ) + '</div>' +
			'<span class="spd-pill">' + esc( titleCase( p.type ) ) + '</span></div>' +
			'<span class="' + stagePillClass( p.stage ) + '">' + esc( titleCase( p.stage ) ) + '</span></div>' +
			'<div class="spd-item-name">' + esc( p.title ) + '</div>' +
			'<div class="spd-item-desc">' + esc( p.logline || 'No logline yet.' ) + '</div>' +
			'<div class="spd-progress-row"><span>Progress</span><span>' + p.progress + '%</span></div>' +
			'<div class="spd-progress-track"><div class="spd-progress-fill" style="width:' + p.progress + '%"></div></div>' +
			'<div class="spd-tags" style="margin-top:12px">' + p.genres.map( function ( g ) { return '<span class="spd-tag">' + esc( g ) + '</span>'; } ).join( '' ) + '</div>' +
			( franchiseById[ p.franchise_id ] ? '<div class="spd-item-meta-row"><span>' + esc( franchiseById[ p.franchise_id ].title ) + '</span><span>' + p.date + '</span></div>' : '<div class="spd-item-meta-row"><span></span><span>' + p.date + '</span></div>' ) +
		'</div>';
	}

	// Cards navigate to the project's Workspace when clicked anywhere except
	// on a nested interactive control (buttons, links, inputs).
	function bindProjectCardLinks() {
		root.querySelectorAll( '[data-nav-workspace]' ).forEach( function ( card ) {
			card.addEventListener( 'click', function ( e ) {
				if ( e.target.closest( 'button, a, input, select, textarea' ) ) { return; }
				location.hash = '#/workspace?project=' + card.dataset.navWorkspace;
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Projects                                                          */
	/* ---------------------------------------------------------------- */

	var projectsView = 'grid';

	function renderProjects() {
		shell( '<div class="spd-empty">Loading projects…</div>' );
		Promise.all( [ loadProjects(), loadFranchises() ] ).then( function ( results ) {
			paintProjects( results[0], results[1] );
		} );
	}

	function paintProjects( projects, franchises, filters ) {
		filters = filters || {};
		var filterText = ( filters.search || '' ).toLowerCase();
		var filterStatus = filters.status || 'All';
		var filterType = filters.type || 'All';

		var visible = projects.filter( function ( p ) {
			var matchSearch = ! filterText || p.title.toLowerCase().indexOf( filterText ) !== -1 ||
				p.genres.join( ' ' ).toLowerCase().indexOf( filterText ) !== -1;
			var matchStatus = filterStatus === 'All' || p.stage === filterStatus;
			var matchType = filterType === 'All' || p.type === filterType;
			return matchSearch && matchStatus && matchType;
		} );

		var franchiseById = {};
		franchises.forEach( function ( f ) { franchiseById[ f.id ] = f; } );

		var bodyHtml;
		if ( projectsView === 'table' ) {
			var rows = visible.map( function ( p ) {
				return '<tr data-project-id="' + p.id + '" data-nav-workspace="' + p.id + '" style="cursor:pointer">' +
					'<td>' + ( TYPE_ICON[ p.type ] || '📁' ) + ' ' + esc( p.title ) + '</td>' +
					'<td>' + esc( titleCase( p.type ) ) + '</td>' +
					'<td><span class="' + stagePillClass( p.stage ) + '">' + esc( titleCase( p.stage ) ) + '</span></td>' +
					'<td>' + p.genres.map( function ( g ) { return esc( g ); } ).join( ', ' ) + '</td>' +
					'<td>' + p.progress + '%</td>' +
					'<td>' + esc( franchiseById[ p.franchise_id ] ? franchiseById[ p.franchise_id ].title : '—' ) + '</td>' +
					'<td>' + esc( p.date ) + '</td>' +
				'</tr>';
			} ).join( '' );
			bodyHtml = '<div class="spd-table-wrap"><table class="spd-table"><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Genres</th><th>Progress</th><th>Franchise</th><th>Updated</th></tr></thead><tbody>' +
				( rows || '<tr><td colspan="7" class="spd-empty">No projects match your search yet.</td></tr>' ) + '</tbody></table></div>';
		} else {
			var cardsHtml = visible.map( function ( p ) { return projectCardHtml( p, franchises ); } ).join( '' );
			bodyHtml = '<div class="spd-grid">' + ( cardsHtml || '<div class="spd-empty">No projects match your search yet.</div>' ) + '</div>';
		}

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Project Database</h1><p class="spd-subtitle">' + projects.length + ' projects in your library</p></div>' +
			'<button class="spd-btn spd-btn-primary" data-action="new-project">+ Add Project</button></div>' +
			'<div class="spd-toolbar">' +
				'<div class="spd-search-wrap"><span class="spd-icon">🔍</span><input class="spd-input" id="spd-project-search" placeholder="Search projects…" value="' + esc( filters.search || '' ) + '"></div>' +
				'<select class="spd-select" id="spd-filter-status"><option value="All">All Statuses</option>' + selectOptions( PROJECT_STAGES, filterStatus ) + '</select>' +
				'<select class="spd-select" id="spd-filter-type"><option value="All">All Types</option>' + selectOptions( PROJECT_TYPES, filterType ) + '</select>' +
				'<div class="spd-view-toggle"><button data-view="grid" class="' + ( projectsView === 'grid' ? 'active' : '' ) + '">Grid</button><button data-view="table" class="' + ( projectsView === 'table' ? 'active' : '' ) + '">Table</button></div>' +
			'</div>' +
			bodyHtml
		);

		bindQuickActions();
		bindProjectCardLinks();

		var search = document.getElementById( 'spd-project-search' );
		function refresh() {
			paintProjects( projects, franchises, {
				search: search.value,
				status: document.getElementById( 'spd-filter-status' ).value,
				type: document.getElementById( 'spd-filter-type' ).value
			} );
		}
		search.addEventListener( 'input', refresh );
		search.focus();
		search.selectionStart = search.selectionEnd = search.value.length;
		document.getElementById( 'spd-filter-status' ).addEventListener( 'change', refresh );
		document.getElementById( 'spd-filter-type' ).addEventListener( 'change', refresh );
		root.querySelectorAll( '[data-view]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () { projectsView = btn.dataset.view; refresh(); } );
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
					loadProjects( true ).then( function () {
						var r = currentRoute();
						if ( r === 'projects' ) { renderProjects(); } else if ( r === 'workspace' ) { renderWorkspace(); } else { renderDashboard(); }
					} );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	function deleteProject( id, onDone ) {
		if ( ! confirm( 'Delete this project? This cannot be undone.' ) ) { return; }
		api( 'projects/' + id, { method: 'DELETE' } ).then( function () {
			toast( 'Project deleted.' );
			loadProjects( true ).then( onDone );
		} ).catch( function ( e ) { toast( e.message, true ); } );
	}

	/* ---------------------------------------------------------------- */
	/* Project Workspace                                                 */
	/* ---------------------------------------------------------------- */

	var workspaceTab = 'Overview';
	var WORKSPACE_TABS = [ 'Overview', 'Characters', 'Beat Sheet', 'Materials', 'AI Notes', 'Export' ];
	var CHECKLIST_ITEMS = [
		{ key: 'logline', label: 'Logline' },
		{ key: 'beatsheet', label: 'Beat Sheet' },
		{ key: 'treatment', label: 'Treatment / Outline' },
		{ key: 'pitch', label: 'Pitch Deck' },
		{ key: 'script', label: 'Script' }
	];

	function renderWorkspace() {
		var pid = currentParams().get( 'project' );
		shell( '<div class="spd-empty">Loading…</div>' );
		Promise.all( [ loadProjects(), loadFranchises(), loadCharacters(), loadBeatTemplates() ] ).then( function ( results ) {
			var projects = results[0];
			var project = projects.find( function ( p ) { return String( p.id ) === String( pid ); } ) || projects[0];
			if ( ! project ) {
				shell( '<div class="spd-header"><div><h1 class="spd-title">Project Workspace</h1></div></div><div class="spd-empty">Create a project first.</div>' );
				return;
			}
			paintWorkspace( project, projects, results[1], results[2], results[3] );
		} );
	}

	function paintWorkspace( project, projects, franchises, characters, templates ) {
		var franchise = franchises.find( function ( f ) { return f.id === project.franchise_id; } );
		var checklist = CHECKLIST_ITEMS.map( function ( c ) {
			var done = ( c.key === 'logline' && project.logline ) ||
				( c.key === 'beatsheet' && project.total_pages && project.beat_template ) ||
				( c.key === 'script' && project.stage === 'script' ) ||
				( c.key === 'treatment' && project.stage === 'treatment' ) ||
				( c.key === 'pitch' && project.stage === 'pitch' ) ||
				project.stage === 'complete';
			return { label: c.label, done: !! done };
		} );
		var checklistPct = Math.round( ( checklist.filter( function ( c ) { return c.done; } ).length / checklist.length ) * 100 );

		var tabsHtml = WORKSPACE_TABS.map( function ( t ) {
			return '<button class="' + ( workspaceTab === t ? 'active' : '' ) + '" data-tab="' + esc( t ) + '">' + esc( t ) + '</button>';
		} ).join( '' );

		shell(
			'<button class="spd-btn-ghost spd-btn" style="border:none;padding:0 0 14px;background:none" data-back-projects>← Project Database</button>' +
			'<div class="spd-header" style="margin-bottom:14px">' +
				'<div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1 class="spd-title" style="margin:0">' + esc( project.title ) + '</h1>' +
				'<span class="' + stagePillClass( project.stage ) + '">' + esc( titleCase( project.stage ) ) + '</span></div>' +
				( franchise ? '<div style="font-size:12px;color:var(--accent);margin-top:4px">🔀 ' + esc( franchise.title ) + '</div>' : '' ) + '</div>' +
				'<div class="spd-header-actions"><button class="spd-btn" data-edit-project="' + project.id + '">✎ Edit</button>' +
				'<button class="spd-btn spd-btn-danger" data-delete-project="' + project.id + '">Delete</button>' +
				'<a class="spd-btn spd-btn-primary" href="' + esc( SPD.adminUrl ) + 'admin-post.php?action=spd_export_onesheet&project_id=' + project.id + '&_wpnonce=' + esc( SPD.exportNonce ) + '" target="_blank">⇩ Export</a></div>' +
			'</div>' +
			'<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">' +
				'<div class="spd-progress-track" style="flex:1"><div class="spd-progress-fill" style="width:' + project.progress + '%"></div></div>' +
				'<span style="font-size:12px;color:var(--text-faint)">' + project.progress + '% complete</span>' +
			'</div>' +
			'<div class="spd-tabstrip">' + tabsHtml + '</div>' +
			'<div id="spd-workspace-body" style="padding-top:24px">' + workspaceTabHtml( project, franchise, characters, checklist, checklistPct, templates ) + '</div>'
		);

		document.querySelector( '[data-back-projects]' ).addEventListener( 'click', function () { location.hash = '#/projects'; } );
		document.querySelector( '[data-edit-project]' ).addEventListener( 'click', function () { openProjectForm( project ); } );
		document.querySelector( '[data-delete-project]' ).addEventListener( 'click', function () {
			deleteProject( project.id, function () { location.hash = '#/projects'; } );
		} );
		root.querySelectorAll( '[data-tab]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				workspaceTab = btn.dataset.tab;
				paintWorkspace( project, projects, franchises, characters, templates );
			} );
		} );

		if ( workspaceTab === 'Beat Sheet' ) { bindWorkspaceBeatsheet( project, templates ); }
		if ( workspaceTab === 'Overview' ) {
			var pricingBtn = root.querySelector( '[data-open-pricing]' );
			if ( pricingBtn ) { pricingBtn.addEventListener( 'click', openPricingModal ); }
		}
		if ( workspaceTab === 'Characters' ) {
			var addCharBtn = root.querySelector( '[data-action="new-character-linked"]' );
			if ( addCharBtn ) { addCharBtn.addEventListener( 'click', function () { openCharacterForm( null, project.id ); } ); }
			root.querySelectorAll( '[data-select-character]' ).forEach( function ( card ) {
				card.addEventListener( 'click', function () { paintCharacters( characters, '', card.dataset.selectCharacter ); } );
			} );
		}
	}

	function workspaceTabHtml( project, franchise, characters, checklist, checklistPct, templates ) {
		if ( workspaceTab === 'Overview' ) {
			var checklistHtml = checklist.map( function ( c ) {
				return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:16px;height:16px;border-radius:4px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
					( c.done ? 'background:var(--accent);border-color:var(--accent)' : '' ) + '">' + ( c.done ? '<span style="color:var(--accent-ink);font-size:10px">✓</span>' : '' ) + '</div>' +
					'<span style="font-size:12px;' + ( c.done ? 'color:var(--text-faintest);text-decoration:line-through' : 'color:var(--text)' ) + '">' + esc( c.label ) + '</span></div>';
			} ).join( '' );

			return '<div class="spd-profile-cols">' +
				'<div>' +
					'<div class="spd-section-label">Logline</div>' +
					'<div class="spd-panel spd-panel-tight" style="font-style:italic;color:#D4C4A0">"' + esc( project.logline || 'No logline yet.' ) + '"</div>' +
					'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">' +
						'<div><div class="spd-section-label">Type</div><div class="spd-panel spd-panel-tight">' + ( TYPE_ICON[ project.type ] || '📁' ) + ' ' + esc( titleCase( project.type ) ) + '</div></div>' +
						'<div><div class="spd-section-label">Genres</div><div class="spd-panel spd-panel-tight"><div class="spd-tags" style="margin:0">' + project.genres.map( function ( g ) { return '<span class="spd-tag">' + esc( g ) + '</span>'; } ).join( '' ) + '</div></div></div>' +
					'</div>' +
					'<div style="margin-top:14px"><div class="spd-section-label">Summary</div><div class="spd-panel spd-panel-tight">' + esc( project.synopsis || 'No summary yet.' ) + '</div></div>' +
				'</div>' +
				'<div>' +
					'<div class="spd-panel">' +
						'<div class="spd-item-top"><div class="spd-panel-title" style="margin:0">Progress Checklist</div><span style="color:var(--accent);font-weight:700;font-size:13px">' + checklistPct + '%</span></div>' +
						'<div class="spd-progress-track" style="margin-bottom:16px"><div class="spd-progress-fill" style="width:' + checklistPct + '%"></div></div>' +
						checklistHtml +
					'</div>' +
					'<div class="spd-panel">' +
						'<div class="spd-panel-title">Project Details</div>' +
						'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px"><span style="color:var(--text-faintest)">Last Updated</span><span style="color:var(--text-dim)">' + esc( project.date ) + '</span></div>' +
						'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:8px"><span style="color:var(--text-faintest)">Franchise</span><span style="color:var(--text-dim)">' + esc( franchise ? franchise.title : '—' ) + '</span></div>' +
						'<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-faintest)">Status</span><span style="color:var(--text-dim)">' + esc( titleCase( project.stage ) ) + '</span></div>' +
					'</div>' +
					'<div class="spd-panel spd-locked">' +
						'<div class="spd-item-top"><div class="spd-panel-title" style="margin:0">Creative IP Record</div><span class="spd-badge-pro">Pro</span></div>' +
						'<div class="spd-locked-content">' +
							'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span style="color:var(--text-faintest)">Record Date</span><span>' + esc( project.date ) + '</span></div>' +
							'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span style="color:var(--text-faintest)">Author</span><span>' + esc( SPD.userDisplayName ) + '</span></div>' +
							'<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:var(--text-faintest)">Registration #</span><span>—</span></div>' +
						'</div>' +
						'<div class="spd-locked-overlay"><span>🔒</span><p>Track copyright records<br>on the Pro plan</p><button type="button" data-open-pricing>Upgrade to Pro →</button></div>' +
					'</div>' +
				'</div>' +
			'</div>';
		}

		if ( workspaceTab === 'Characters' ) {
			var linked = characters.filter( function ( c ) { return c.project_id === project.id; } );
			return '<div class="spd-grid">' +
				linked.map( function ( c ) { return characterCardHtml( c ); } ).join( '' ) +
				'<button type="button" class="spd-add-tile" data-action="new-character-linked"><span style="font-size:20px">+</span>Add Character</button>' +
			'</div>';
		}

		if ( workspaceTab === 'Beat Sheet' ) {
			return '<div class="spd-toolbar">' +
					'<select class="spd-select" id="ws-bs-template">' + selectOptions( templates.map( function ( t ) { return { value: t.key, label: t.label }; } ), project.beat_template, function ( v ) { return v.label; } ) + '</select>' +
					'<input class="spd-input" type="number" min="1" id="ws-bs-pages" value="' + ( project.total_pages || 100 ) + '" style="width:110px" placeholder="Total pages">' +
					'<button class="spd-btn spd-btn-primary" id="ws-bs-generate">Generate Beat Pages</button>' +
				'</div>' +
				'<div id="ws-bs-results"></div>';
		}

		// Materials / AI Notes / Export — matches Figma's empty-state treatment exactly.
		var meta = {
			'Materials': { icon: '🗂️', desc: 'Upload treatments, outlines, scripts, posters, and research documents.', cta: '⇧ Upload Files' },
			'AI Notes': { icon: '✨', desc: 'AI-generated story analysis, arc notes, and development suggestions.', cta: '✨ Analyze Project' },
			'Export': { icon: '⇩', desc: 'Export your project as a one-sheet PDF, character sheet, or full treatment.', cta: '⇩ Generate Export' }
		}[ workspaceTab ];
		return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;max-width:380px;margin:0 auto">' +
			'<div style="width:48px;height:48px;border-radius:var(--radius);background:var(--panel);border:1px solid var(--border-soft);display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:20px">' + meta.icon + '</div>' +
			'<h3 style="font-size:14px;font-weight:600;margin:0 0 8px">' + esc( workspaceTab ) + '</h3>' +
			'<p style="font-size:12px;color:var(--text-faint);line-height:1.6;margin:0 0 20px">' + meta.desc + '</p>' +
			'<button class="spd-btn">' + meta.cta + '</button>' +
		'</div>';
	}

	function bindWorkspaceBeatsheet( project, templates ) {
		var genBtn = document.getElementById( 'ws-bs-generate' );
		var holder = document.getElementById( 'ws-bs-results' );

		function paintBeats( beats ) {
			if ( ! beats || ! beats.length ) { holder.innerHTML = ''; return; }
			holder.innerHTML = '<div class="spd-table-wrap"><table class="spd-table"><thead><tr><th>Beat</th><th>Pg</th><th>Description</th></tr></thead><tbody>' +
				beats.map( function ( b ) { return '<tr><td>' + esc( b.beat ) + '</td><td class="spd-page">' + b.page + '</td><td>' + esc( b.description ) + '</td></tr>'; } ).join( '' ) +
				'</tbody></table></div>';
		}

		api( 'projects/' + project.id + '/beatsheet' ).then( function ( d ) { paintBeats( d.beats ); } );

		genBtn.addEventListener( 'click', function () {
			var pages = document.getElementById( 'ws-bs-pages' ).value;
			var template = document.getElementById( 'ws-bs-template' ).value;
			api( 'projects/' + project.id + '/beatsheet', { method: 'POST', body: { total_pages: pages, template: template } } ).then( function ( d ) {
				toast( 'Beat sheet generated.' );
				paintBeats( d.beats );
				loadProjects( true );
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Franchises                                                        */
	/* ---------------------------------------------------------------- */

	function renderFranchises() {
		shell( '<div class="spd-empty">Loading franchises…</div>' );
		Promise.all( [ loadFranchises(), loadProjects() ] ).then( function ( results ) { paintFranchises( results[0], results[1] ); } );
	}

	function paintFranchises( franchises, projects ) {
		var cardsHtml = franchises.map( function ( f ) {
			var linked = f.projects.map( function ( p ) {
				return '<div class="spd-linked-row"><span>' + ( TYPE_ICON[ p.type ] || '📁' ) + ' ' + esc( p.title ) + '</span><span class="' + stagePillClass( p.stage ) + '">' + esc( titleCase( p.stage ) ) + '</span></div>';
			} ).join( '' );

			return '<div class="spd-item-card">' +
				'<div class="spd-item-top"><div class="spd-item-icon-row"><div class="spd-item-icon">🔀</div><div class="spd-item-name" style="margin:0">' + esc( f.title ) + '</div></div>' +
				'<span class="spd-pill' + ( f.status === 'active' ? ' spd-pill-status-complete' : '' ) + '">' + esc( titleCase( f.status ) ) + '</span></div>' +
				'<div class="spd-item-desc">' + esc( f.description || '' ) + '</div>' +
				'<div class="spd-tags">' + f.genres.map( function ( g ) { return '<span class="spd-tag">' + esc( g ) + '</span>'; } ).join( '' ) + '</div>' +
				( linked ? '<div class="spd-linked-projects"><div class="spd-linked-label">Linked Projects</div>' + linked + '</div>' : '' ) +
				'<div class="spd-item-card-actions"><button class="spd-btn spd-btn-sm" data-edit-franchise="' + f.id + '">Edit</button>' +
				'<button class="spd-btn spd-btn-sm spd-btn-danger" data-delete-franchise="' + f.id + '">Delete</button></div>' +
			'</div>';
		} ).join( '' );

		var unassigned = ( projects || [] ).filter( function ( p ) { return ! p.franchise_id; } );
		var unassignedHtml = unassigned.map( function ( p ) {
			return '<div class="spd-item-card" style="display:flex;align-items:center;gap:12px;padding:12px 16px">' +
				'<span>' + ( TYPE_ICON[ p.type ] || '📁' ) + '</span><span style="flex:1;font-size:12.5px">' + esc( p.title ) + '</span>' +
				'<span class="' + stagePillClass( p.stage ) + '">' + esc( titleCase( p.stage ) ) + '</span>' +
				'<button class="spd-btn spd-btn-sm" data-assign-project="' + p.id + '">Add to Franchise</button>' +
			'</div>';
		} ).join( '' );

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Franchise Database</h1><p class="spd-subtitle">Manage your IP universes and connected project ecosystems.</p></div>' +
			'<button class="spd-btn spd-btn-primary" data-action="new-franchise">+ New Franchise</button></div>' +
			'<div class="spd-grid" style="margin-bottom:32px">' + cardsHtml +
				'<button type="button" class="spd-add-tile" data-action="new-franchise"><span style="font-size:20px">+</span>Create New Franchise</button>' +
			'</div>' +
			( unassigned.length ? '<div><h2 style="font-size:13px;font-weight:600;margin:0 0 12px">Unassigned Projects</h2><div class="spd-card-list">' + unassignedHtml + '</div></div>' : '' )
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
					loadFranchises( true ).then( function ( fresh ) { paintFranchises( fresh, projects ); } );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
		root.querySelectorAll( '[data-assign-project]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				var franchiseOptions = selectOptions( franchises.map( function ( f ) { return { value: f.id, label: f.title }; } ), '', function ( v ) { return v.label; } );
				openModal( 'Add to Franchise', '<div class="spd-field"><label>Franchise</label><select class="spd-select" name="franchise_id">' + franchiseOptions + '</select></div>', function ( fd, close ) {
					api( 'projects/' + btn.dataset.assignProject, { method: 'PUT', body: { franchise_id: fd.get( 'franchise_id' ) } } ).then( function () {
						toast( 'Project linked to franchise.' );
						close();
						loadProjects( true ).then( function () { loadFranchises( true ).then( function ( fresh ) { paintFranchises( fresh, cache.projects ); } ); } );
					} ).catch( function ( e ) { toast( e.message, true ); } );
				} );
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
				loadFranchises( true ).then( function ( fresh ) { if ( currentRoute() === 'franchises' ) { paintFranchises( fresh, cache.projects ); } else { renderDashboard(); } } );
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Characters                                                        */
	/* ---------------------------------------------------------------- */

	function characterCardHtml( c ) {
		return '<div class="spd-item-card" data-select-character="' + c.id + '" style="cursor:pointer">' +
			'<div class="spd-item-top"><div class="spd-item-icon-row"><div class="spd-avatar">' + esc( initials( c.name ) ) + '</div>' +
			'<div><div class="spd-item-name" style="margin:0">' + esc( c.name ) + '</div>' +
			'<span class="' + rolePillClass( c.role ) + '">' + esc( titleCase( c.role ) ) + '</span></div></div></div>' +
			( c.project_name ? '<div class="spd-item-desc" style="margin-bottom:2px">' + esc( c.project_name ) + '</div>' : '' ) +
			'<div class="spd-item-desc">' + esc( c.arc || '' ) + '</div>' +
			'<div class="spd-tags">' + c.traits.map( function ( t ) { return '<span class="spd-tag">' + esc( t ) + '</span>'; } ).join( '' ) + '</div>' +
		'</div>';
	}

	function renderCharacters() {
		shell( '<div class="spd-empty">Loading characters…</div>' );
		loadCharacters().then( function ( chars ) { paintCharacters( chars ); } );
	}

	function paintCharacters( characters, filterText, selectedId ) {
		if ( selectedId ) { paintCharacterDetail( characters, selectedId ); return; }

		filterText = ( filterText || '' ).toLowerCase();
		var visible = characters.filter( function ( c ) { return ! filterText || c.name.toLowerCase().indexOf( filterText ) !== -1; } );

		var cardsHtml = visible.map( function ( c ) { return characterCardHtml( c ); } ).join( '' );

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Character Database</h1><p class="spd-subtitle">' + characters.length + ' characters across all projects</p></div>' +
			'<button class="spd-btn spd-btn-primary" data-action="new-character">+ New Character</button></div>' +
			'<div class="spd-toolbar"><div class="spd-search-wrap"><span class="spd-icon">🔍</span><input class="spd-input" id="spd-char-search" placeholder="Search characters…" value="' + esc( filterText ) + '"></div></div>' +
			'<div class="spd-grid">' + ( cardsHtml || '<div class="spd-empty">No characters match yet.</div>' ) +
				'<button type="button" class="spd-add-tile" data-action="new-character"><span style="font-size:20px">+</span>Add Character</button>' +
			'</div>'
		);

		bindQuickActions();
		var search = document.getElementById( 'spd-char-search' );
		search.addEventListener( 'input', function () { paintCharacters( characters, search.value ); } );

		root.querySelectorAll( '[data-select-character]' ).forEach( function ( card ) {
			card.addEventListener( 'click', function () { paintCharacters( characters, filterText, card.dataset.selectCharacter ); } );
		} );
	}

	function paintCharacterDetail( characters, id ) {
		var c = characters.find( function ( x ) { return String( x.id ) === String( id ); } );
		if ( ! c ) { paintCharacters( characters ); return; }

		var facts = [
			{ key: 'Archetype', val: c.archetype },
			{ key: 'Personality', val: c.personality },
			{ key: 'Motivation', val: c.motivation },
			{ key: 'Strength', val: c.strength },
			{ key: 'Flaw', val: c.flaw }
		];
		var factsHtml = facts.map( function ( f ) {
			return '<div class="spd-char-fact"><div class="spd-char-fact-key">' + esc( f.key ) + '</div><div class="spd-char-fact-val">' + esc( f.val || '—' ) + '</div></div>';
		} ).join( '' );

		var relHtml = c.relationships.length ? c.relationships.map( function ( r ) {
			return '<div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:var(--radius-sm);background:var(--panel-2);border:1px solid var(--border-soft);margin-bottom:8px">' +
				'<div class="spd-avatar" style="background:var(--chip);color:var(--text-faint)">' + esc( ( r.name || '?' )[0] ) + '</div>' +
				'<div><div style="font-size:12px;font-weight:500">' + esc( r.name ) + '</div><div style="font-size:10.5px;color:var(--text-faintest)">' + esc( r.rel ) + '</div></div>' +
			'</div>';
		} ).join( '' ) : '<div class="spd-empty" style="padding:20px 0;text-align:left">No relationships recorded yet.</div>';

		shell(
			'<button class="spd-btn-ghost spd-btn" style="border:none;padding:0 0 20px;background:none" data-back-characters>← Character Database</button>' +
			'<div class="spd-char-detail-grid">' +
				'<div>' +
					'<div class="spd-panel" style="text-align:center;display:flex;flex-direction:column;align-items:center">' +
						'<div class="spd-profile-avatar" style="font-size:20px;margin-bottom:10px">' + esc( initials( c.name ) ) + '</div>' +
						'<div class="spd-profile-name">' + esc( c.name ) + '</div>' +
						'<div style="font-size:11px;color:var(--text-faintest);margin:2px 0 8px">' + esc( c.project_name || '' ) + '</div>' +
						'<span class="' + rolePillClass( c.role ) + '">' + esc( titleCase( c.role ) ) + '</span>' +
					'</div>' +
					'<div class="spd-panel">' + factsHtml + '</div>' +
					'<div class="spd-item-card-actions"><button class="spd-btn spd-btn-sm" data-edit-character="' + c.id + '">Edit</button>' +
					'<button class="spd-btn spd-btn-sm spd-btn-danger" data-delete-character="' + c.id + '">Delete</button></div>' +
				'</div>' +
				'<div>' +
					'<div class="spd-section-label">Character Arc</div>' +
					'<div class="spd-panel spd-panel-tight" style="margin-bottom:18px">' + esc( c.arc || '—' ) + '</div>' +
					'<div class="spd-section-label">Description</div>' +
					'<div class="spd-panel spd-panel-tight" style="margin-bottom:18px">' + esc( c.description || 'No description yet.' ) + '</div>' +
					'<div class="spd-section-label">Relationships</div>' + relHtml +
				'</div>' +
			'</div>'
		);

		document.querySelector( '[data-back-characters]' ).addEventListener( 'click', function () { paintCharacters( characters ); } );
		document.querySelector( '[data-edit-character]' ).addEventListener( 'click', function () { openCharacterForm( c ); } );
		document.querySelector( '[data-delete-character]' ).addEventListener( 'click', function () {
			if ( ! confirm( 'Delete this character?' ) ) { return; }
			api( 'characters/' + c.id, { method: 'DELETE' } ).then( function () {
				toast( 'Character deleted.' );
				loadCharacters( true ).then( function ( fresh ) { paintCharacters( fresh ); } );
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );
	}

	function openCharacterForm( character, prefillProjectId ) {
		loadProjects().then( function ( projects ) {
			var projectOptions = '<option value="0">— Unassigned —</option>' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), character ? character.project_id : prefillProjectId, function ( v ) { return v.label; } );
			var relText = character && character.relationships.length ? character.relationships.map( function ( r ) { return r.name + ' — ' + r.rel; } ).join( '\n' ) : '';

			var body =
				'<div class="spd-field"><label>Name</label><input class="spd-input" name="title" required value="' + esc( character ? character.name : '' ) + '"></div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Role</label><select class="spd-select" name="role">' + selectOptions( CHARACTER_ROLES, character ? character.role : 'protagonist' ) + '</select></div>' +
					'<div class="spd-field"><label>Project</label><select class="spd-select" name="project_id">' + projectOptions + '</select></div>' +
				'</div>' +
				'<div class="spd-field"><label>Arc</label><textarea class="spd-input" name="arc" rows="2">' + esc( character ? character.arc : '' ) + '</textarea></div>' +
				'<div class="spd-field"><label>Description</label><textarea class="spd-input" name="description" rows="2">' + esc( character ? character.description : '' ) + '</textarea></div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Archetype</label><input class="spd-input" name="archetype" value="' + esc( character ? character.archetype : '' ) + '"></div>' +
					'<div class="spd-field"><label>Personality</label><input class="spd-input" name="personality" value="' + esc( character ? character.personality : '' ) + '"></div>' +
				'</div>' +
				'<div class="spd-field-row">' +
					'<div class="spd-field"><label>Strength</label><input class="spd-input" name="strength" value="' + esc( character ? character.strength : '' ) + '"></div>' +
					'<div class="spd-field"><label>Flaw</label><input class="spd-input" name="flaw" value="' + esc( character ? character.flaw : '' ) + '"></div>' +
				'</div>' +
				'<div class="spd-field"><label>Motivation</label><input class="spd-input" name="motivation" value="' + esc( character ? character.motivation : '' ) + '"></div>' +
				'<div class="spd-field"><label>Traits (comma separated)</label><input class="spd-input" name="traits" value="' + esc( character ? character.traits.join( ', ' ) : '' ) + '"></div>' +
				'<div class="spd-field"><label>Relationships (one per line: Name — relationship)</label><textarea class="spd-input" name="relationships" rows="2">' + esc( relText ) + '</textarea></div>';

			openModal( character ? 'Edit Character' : 'New Character', body, function ( fd, close ) {
				var relationships = String( fd.get( 'relationships' ) || '' ).split( '\n' ).map( function ( line ) {
					var parts = line.split( '—' );
					var name = ( parts[0] || '' ).trim();
					var rel = ( parts.slice( 1 ).join( '—' ) || '' ).trim();
					return name ? { name: name, rel: rel } : null;
				} ).filter( Boolean );

				var payload = {
					title: fd.get( 'title' ), role: fd.get( 'role' ), project_id: fd.get( 'project_id' ), arc: fd.get( 'arc' ),
					description: fd.get( 'description' ), archetype: fd.get( 'archetype' ), personality: fd.get( 'personality' ),
					strength: fd.get( 'strength' ), flaw: fd.get( 'flaw' ), motivation: fd.get( 'motivation' ),
					traits: fd.get( 'traits' ).split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean ),
					relationships: relationships
				};
				var req = character ? api( 'characters/' + character.id, { method: 'PUT', body: payload } ) : api( 'characters', { method: 'POST', body: payload } );
				req.then( function () {
					toast( character ? 'Character updated.' : 'Character created.' );
					close();
					loadCharacters( true ).then( function ( fresh ) {
						var r = currentRoute();
						if ( r === 'characters' ) { paintCharacters( fresh ); } else if ( r === 'workspace' ) { renderWorkspace(); } else { renderDashboard(); }
					} );
				} ).catch( function ( e ) { toast( e.message, true ); } );
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Beat sheet calculator (standalone page)                           */
	/* ---------------------------------------------------------------- */

	function renderBeatsheet() {
		shell( '<div class="spd-empty">Loading…</div>' );
		var preselect = currentParams().get( 'project' );

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
			'<div class="spd-toolbar" style="align-items:flex-end">' +
				'<select class="spd-select" id="spd-bs-project">' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), selectedId, function ( v ) { return v.label; } ) + '</select>' +
				'<input class="spd-input" type="number" min="1" id="spd-bs-pages" value="' + ( project.total_pages || 100 ) + '" style="width:110px" placeholder="Total pages">' +
				'<select class="spd-select" id="spd-bs-template">' + selectOptions( templates.map( function ( t ) { return { value: t.key, label: t.label }; } ), project.beat_template, function ( v ) { return v.label; } ) + '</select>' +
				'<button class="spd-btn spd-btn-primary" id="spd-bs-generate">Generate Beat Pages</button>' +
			'</div>' +
			'<div id="spd-bs-results"></div>'
		);

		function paintBeats( beats ) {
			var holder = document.getElementById( 'spd-bs-results' );
			if ( ! beats || ! beats.length ) { holder.innerHTML = ''; return; }
			holder.innerHTML = '<div class="spd-table-wrap"><table class="spd-table"><thead><tr><th>Beat</th><th>Pg</th><th>Description</th></tr></thead><tbody>' +
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
		{ key: 'script', label: 'Script', hint: '.fdx, .pdf, .docx', icon: '📄' },
		{ key: 'treatment', label: 'Treatment / Outline', hint: '.docx, .pdf', icon: '🗂️' },
		{ key: 'beat_sheet', label: 'Beat Sheet', hint: '.xlsx, .csv', icon: '📊' },
		{ key: 'poster', label: 'Film Poster', hint: '.jpg, .png, .svg', icon: '⭐' },
		{ key: 'research', label: 'Research Documents', hint: '.pdf, .docx', icon: '📖' }
	];
	var EXPORT_TYPES = [
		{ label: 'One-Page Project Sheet', desc: 'PDF one-sheet with title, logline, summary, and contact.', icon: '📄' },
		{ label: 'Project Summary PDF', desc: 'Full project overview with all fields and status.', icon: '🗂️' },
		{ label: 'Character Sheet PDF', desc: 'Complete character profiles for a selected project.', icon: '👥' },
		{ label: 'Franchise Overview PDF', desc: 'Full IP universe summary with all linked projects.', icon: '🔀' }
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

		var importRows = IMPORT_CATEGORIES.map( function ( c ) {
			return '<div class="spd-import-row"><div class="spd-import-row-left"><div class="spd-import-icon">' + c.icon + '</div><div>' +
				'<div style="font-size:12.5px;font-weight:500">' + esc( c.label ) + '</div><div style="font-size:10.5px;color:var(--text-faintest)">' + c.hint + '</div></div></div>' +
				'<button class="spd-btn spd-btn-sm" data-upload-cat="' + c.key + '">⇧</button></div>';
		} ).join( '' );

		var exportRows = EXPORT_TYPES.map( function ( e ) {
			return '<div class="spd-import-row"><div class="spd-import-row-left"><div class="spd-import-icon">' + e.icon + '</div><div>' +
				'<div style="font-size:12.5px;font-weight:500">' + esc( e.label ) + '</div><div style="font-size:10.5px;color:var(--text-faintest)">' + esc( e.desc ) + '</div></div></div>' +
				'<button class="spd-btn spd-btn-sm" data-export-type>Export</button></div>';
		} ).join( '' );

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Imports &amp; Exports</h1><p class="spd-subtitle">Bring in your existing work and export polished materials.</p></div></div>' +
			'<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px" id="spd-io-grid">' +
				'<div>' +
					'<div class="spd-panel-title">⇧ Import Files</div>' +
					'<div class="spd-dropzone" id="spd-dropzone"><div style="font-size:22px;margin-bottom:8px">⇧</div><div style="font-size:12.5px">Drop files here or click to browse</div>' +
						'<div style="font-size:11px;color:var(--text-faintest);margin-top:4px">Scripts, treatments, beat sheets, posters, research</div></div>' +
					'<div class="spd-field" style="margin-bottom:12px"><select class="spd-select" id="spd-import-project" style="width:100%">' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), selectedId, function ( v ) { return v.label; } ) + '</select></div>' +
					importRows +
					'<input type="file" id="spd-file-input" style="display:none">' +
					'<div class="spd-panel" style="margin-top:16px"><div class="spd-panel-title">Existing Imports</div><div id="spd-imports-list"></div></div>' +
				'</div>' +
				'<div>' +
					'<div class="spd-panel-title">⇩ Export Materials</div>' +
					'<div class="spd-field"><label>Select Project</label><select class="spd-select" id="spd-export-project" style="width:100%">' + selectOptions( projects.map( function ( p ) { return { value: p.id, label: p.title }; } ), selectedId, function ( v ) { return v.label; } ) + '</select></div>' +
					exportRows +
					'<div class="spd-panel" style="margin-top:16px"><div class="spd-section-label">One-Sheet Preview</div><div id="spd-onesheet-preview"></div></div>' +
				'</div>' +
			'</div>'
		);

		var projectSelect = document.getElementById( 'spd-import-project' );
		var exportSelect = document.getElementById( 'spd-export-project' );
		var fileInput = document.getElementById( 'spd-file-input' );
		var pendingCategory = null;

		function refreshImportsList() {
			var pid = projectSelect.value;
			api( 'projects/' + pid + '/imports' ).then( function ( items ) {
				var holder = document.getElementById( 'spd-imports-list' );
				if ( ! items.length ) { holder.innerHTML = '<div class="spd-empty" style="padding:12px 0">No files imported for this project yet.</div>'; return; }
				holder.innerHTML = items.map( function ( it ) {
					return '<div class="spd-import-row"><div class="spd-import-row-left"><span class="spd-pill">' + esc( titleCase( it.category ) ) + '</span>' +
						'<a href="' + esc( it.url ) + '" target="_blank" rel="noopener" style="color:var(--text);font-size:12px">' + esc( it.title ) + '</a></div>' +
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

		function refreshPreview() {
			var p = projects.find( function ( x ) { return String( x.id ) === String( exportSelect.value ); } );
			var holder = document.getElementById( 'spd-onesheet-preview' );
			if ( ! p ) { holder.innerHTML = ''; return; }
			holder.innerHTML = '<div class="spd-panel spd-panel-tight" style="background:var(--bg)">' +
				'<div style="font-size:14px;font-weight:700;margin-bottom:8px">' + esc( p.title ) + '</div>' +
				'<div class="spd-tags" style="margin-bottom:8px"><span class="spd-tag">' + esc( titleCase( p.type ) ) + '</span>' + p.genres.slice( 0, 2 ).map( function ( g ) { return '<span class="spd-tag">' + esc( g ) + '</span>'; } ).join( '' ) + '</div>' +
				'<p style="font-size:11px;color:var(--text-dim);font-style:italic;line-height:1.5">"' + esc( ( p.logline || '' ).slice( 0, 100 ) ) + '"</p>' +
				'<div style="border-top:1px solid var(--border-faint);padding-top:8px;margin-top:8px;font-size:10.5px;color:var(--text-faintest)">' + esc( SPD.userDisplayName ) + '</div>' +
			'</div>';
		}
		refreshPreview();
		exportSelect.addEventListener( 'change', refreshPreview );

		document.getElementById( 'spd-dropzone' ).addEventListener( 'click', function () { pendingCategory = 'research'; fileInput.click(); } );
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

		root.querySelectorAll( '[data-export-type]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				var url = SPD.adminUrl + 'admin-post.php?action=spd_export_onesheet&project_id=' + exportSelect.value + '&_wpnonce=' + SPD.exportNonce;
				window.open( url, '_blank' );
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Billing (display only)                                            */
	/* ---------------------------------------------------------------- */

	function renderBilling() {
		shell( '<div class="spd-empty">Loading…</div>' );
		api( 'billing' ).then( function ( d ) {
			var current = d.plans.find( function ( p ) { return p.id === d.current_plan; } ) || d.plans[0];
			var upsell = d.plans.find( function ( p ) { return p.id !== d.current_plan && p.price; } );

			shell(
				'<div class="spd-header"><div><h1 class="spd-title">Billing</h1><p class="spd-subtitle">Manage your subscription and plan.</p></div></div>' +
				'<div class="spd-panel"><div class="spd-plan-card"><div><div style="color:var(--text-faint);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Current Plan</div>' +
					'<div style="font-size:16px;font-weight:600;margin:6px 0">' + esc( current.name ) + ( current.price ? ' — $' + current.price + esc( current.period ) : ' — Free' ) + '</div>' +
					'<div style="font-size:11px;color:var(--text-faintest)">' + current.features.slice( 0, 3 ).join( ' · ' ) + '</div></div>' +
					'<button class="spd-btn spd-btn-primary" id="spd-upgrade-btn">Upgrade Plan</button></div>' +
					'<div style="border-top:1px solid var(--border-soft);margin-top:16px;padding-top:14px">' +
						'<div class="spd-section-label">What\'s included</div>' +
						'<ul class="spd-plan-features">' + current.features.map( function ( f ) { return '<li>' + esc( f ) + '</li>'; } ).join( '' ) + '</ul>' +
					'</div>' +
				'</div>' +
				( upsell ? '<div class="spd-panel spd-upgrade-banner"><div class="spd-plan-card"><div><div style="font-size:14px;font-weight:600;margin-bottom:4px">Upgrade to ' + esc( upsell.name ) + ' — $' + upsell.price + esc( upsell.period ) + '</div>' +
					'<div style="color:var(--text-dim);font-size:11.5px;line-height:1.5">' + upsell.features.slice( 1, 5 ).join( ' · ' ) + '</div></div>' +
					'<button class="spd-btn spd-btn-primary" id="spd-see-plans-btn">See Plans</button></div></div>' : '' ) +
				'<div class="spd-panel"><div class="spd-panel-title">Payment Method</div><div style="font-size:12px;color:var(--text-faintest)">No payment method on file. Add one when you upgrade to a paid plan.</div></div>'
			);

			[ 'spd-upgrade-btn', 'spd-see-plans-btn' ].forEach( function ( id ) {
				var btn = document.getElementById( id );
				if ( btn ) { btn.addEventListener( 'click', function () { openPricingModal(); } ); }
			} );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Creator Profile                                                   */
	/* ---------------------------------------------------------------- */

	function renderProfile() {
		shell( '<div class="spd-empty">Loading…</div>' );
		Promise.all( [ api( 'profile' ), loadProjects() ] ).then( function ( results ) { paintProfile( results[0], results[1], false ); } );
	}

	function chipListHtml( items ) {
		return '<div class="spd-chip-list">' + items.map( function ( t ) { return '<span class="spd-chip">' + esc( t ) + '</span>'; } ).join( '' ) + '</div>';
	}

	function paintProfile( profile, projects, editing ) {
		if ( editing ) { paintProfileEdit( profile, projects ); return; }

		var experienceHtml = profile.experience.length ? profile.experience.map( function ( e ) {
			return '<div class="spd-timeline-item"><div class="spd-timeline-role">' + esc( e.role ) + '</div>' +
				'<div class="spd-timeline-meta">' + esc( e.company ) + ' · ' + esc( e.period ) + '</div>' +
				'<div class="spd-timeline-desc">' + esc( e.desc ) + '</div></div>';
		} ).join( '' ) : '<div class="spd-empty" style="padding:10px 0;text-align:left">No experience added yet.</div>';

		var filmographyHtml = projects.length ? projects.map( function ( p ) {
			return '<div class="spd-filmography-row"><div><div class="spd-filmography-title">' + esc( p.title ) + '</div>' +
				'<div class="spd-filmography-meta">' + esc( titleCase( p.type ) ) + ' · ' + esc( p.genres[0] || '—' ) + ' · In Development</div></div>' +
				'<div style="display:flex;gap:6px;flex-shrink:0"><span class="spd-pill">Writer</span><span class="' + stagePillClass( p.stage ) + '">' + esc( titleCase( p.stage ) ) + '</span></div></div>';
		} ).join( '' ) : '<div class="spd-empty" style="padding:10px 0;text-align:left">No projects yet.</div>';

		var awardsHtml = profile.awards.length ? profile.awards.map( function ( a ) {
			return '<div class="spd-timeline-item"><div style="display:flex;align-items:center;gap:6px"><span style="color:var(--accent)">🏆</span>' +
				'<span class="spd-timeline-role">' + esc( a.name ) + '</span><span style="font-size:10px;color:var(--text-faintest)">' + esc( a.year ) + '</span></div>' +
				'<div class="spd-timeline-meta">' + esc( a.org ) + '</div><div class="spd-timeline-desc">Project: ' + esc( a.project ) + '</div></div>';
		} ).join( '' ) : '<div class="spd-empty" style="padding:10px 0;text-align:left">No awards added yet.</div>';

		var contactFields = [
			{ label: 'Professional Email', val: profile.email, icon: '✉' },
			{ label: 'Phone', val: profile.phone, icon: '☎' },
			{ label: 'Website', val: profile.website, icon: '🌐' },
			{ label: 'IMDb', val: profile.imdb, icon: '⭐' },
			{ label: 'LinkedIn', val: profile.linkedin, icon: 'in' }
		];
		var contactHtml = contactFields.map( function ( f ) {
			return '<div><div class="spd-section-label" style="margin-bottom:6px">' + esc( f.label ) + '</div>' +
				'<div class="spd-contact-field"><span>' + f.icon + '</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis">' + esc( f.val || '—' ) + '</span></div></div>';
		} ).join( '' );

		var docsHtml = [ 'Resume', 'CV', 'Professional Bio', 'Filmography', 'Creator One-Sheet' ].map( function ( doc ) {
			return '<div class="spd-doc-row"><span>📄 ' + doc + '</span><button type="button" data-open-pricing style="background:none;border:none;color:var(--accent);font-size:10.5px;cursor:pointer;font-family:inherit">🔒 Export</button></div>';
		} ).join( '' );

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Creator Profile</h1><p class="spd-subtitle">Build your professional creative identity.</p></div>' +
			'<button class="spd-btn spd-btn-outline" id="pf-edit">Edit Profile</button></div>' +
			'<div class="spd-panel"><div class="spd-profile-header">' +
				'<div class="spd-profile-avatar">' + esc( initials( profile.name ) ) + '</div>' +
				'<div><div class="spd-profile-name">' + esc( profile.name || 'Add your name' ) + '</div>' +
				'<div class="spd-profile-title">' + esc( profile.title || '' ) + '</div>' +
				'<div class="spd-profile-meta">' + esc( [ profile.company, profile.location ].filter( Boolean ).join( ' · ' ) ) + '</div>' +
				'<div class="spd-profile-contacts">' +
					( profile.email ? '<span>✉ ' + esc( profile.email ) + '</span>' : '' ) +
					( profile.website ? '<span>🌐 ' + esc( profile.website ) + '</span>' : '' ) +
					( profile.linkedin ? '<span>in ' + esc( profile.linkedin ) + '</span>' : '' ) +
				'</div></div>' +
			'</div></div>' +
			'<div class="spd-profile-cols">' +
				'<div>' +
					'<div class="spd-panel"><div class="spd-panel-title">Professional Summary</div>' +
						'<div class="spd-section-label">Professional Bio</div><div class="spd-panel-tight spd-panel" style="margin-bottom:12px">' + esc( profile.bio || '—' ) + '</div>' +
						'<div class="spd-section-label">Short Bio</div><div class="spd-panel-tight spd-panel" style="margin-bottom:12px">' + esc( profile.short_bio || '—' ) + '</div>' +
						'<div class="spd-section-label">Creative Statement</div><div class="spd-panel-tight spd-panel" style="margin-bottom:12px">' + esc( profile.creative_statement || '—' ) + '</div>' +
						'<div class="spd-section-label">Areas of Expertise</div>' + chipListHtml( profile.expertise.length ? profile.expertise : [ '—' ] ) +
						'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">' +
							'<div><div class="spd-section-label">Genres</div>' + chipListHtml( profile.genres.length ? profile.genres : [ '—' ] ) + '</div>' +
							'<div><div class="spd-section-label">Formats</div>' + chipListHtml( profile.formats.length ? profile.formats : [ '—' ] ) + '</div>' +
						'</div>' +
					'</div>' +
					'<div class="spd-panel"><div class="spd-panel-title">Professional Experience</div>' + experienceHtml + '</div>' +
					'<div class="spd-panel"><div class="spd-panel-title">Credits / Filmography</div>' +
						'<div style="font-size:10.5px;color:var(--text-faintest);margin-bottom:8px">Connected from your Project Database.</div>' + filmographyHtml + '</div>' +
					'<div class="spd-panel"><div class="spd-panel-title">Skills</div>' + chipListHtml( profile.skills.length ? profile.skills : [ '—' ] ) + '</div>' +
					'<div class="spd-panel"><div class="spd-panel-title">Awards &amp; Achievements</div>' + awardsHtml + '</div>' +
					'<div class="spd-panel"><div class="spd-panel-title">Contact Information</div><div class="spd-contact-grid">' + contactHtml + '</div></div>' +
				'</div>' +
				'<div>' +
					'<div class="spd-panel"><div class="spd-item-top"><div class="spd-panel-title" style="margin:0">Professional Documents</div><span class="spd-badge-pro">Pro</span></div>' +
						'<p style="font-size:10.5px;color:var(--text-faintest);line-height:1.5;margin:0 0 14px">Turn your profile into professional documents ready to send.</p>' +
						docsHtml +
						'<div class="spd-callout" style="background:rgba(212,169,106,0.05);border-color:rgba(212,169,106,0.15);margin-top:12px"><p style="color:var(--text-dim)">Your professional profile is ready. <button type="button" data-open-pricing style="background:none;border:none;color:var(--accent);cursor:pointer;font-family:inherit;font-size:10.5px;padding:0">Upgrade to Pro</button> to export your resume, CV, filmography, and professional documents.</p></div>' +
					'</div>' +
					'<div class="spd-panel"><div class="spd-item-top"><div class="spd-panel-title" style="margin:0">Public Profile</div><span class="spd-badge-soon">Soon</span></div>' +
						'<p style="font-size:10.5px;color:var(--text-faintest);line-height:1.5;margin:0 0 14px">Share a professional portfolio that showcases your work and creative identity.</p>' +
						'<div class="spd-toggle-row"><span style="font-size:12px;color:var(--text-faintest)">Enable Public Profile</span><div class="spd-toggle-track"></div></div>' +
					'</div>' +
					'<div class="spd-callout"><div class="spd-section-label">How it works</div><p>Enter your information once. Project Database uses it across your projects, exports, and future professional documents.</p></div>' +
				'</div>' +
			'</div>'
		);

		document.getElementById( 'pf-edit' ).addEventListener( 'click', function () { paintProfile( profile, projects, true ); } );
		root.querySelectorAll( '[data-open-pricing]' ).forEach( function ( btn ) { btn.addEventListener( 'click', openPricingModal ); } );
	}

	function listInputHtml( id, label, values ) {
		return '<div class="spd-field"><label>' + esc( label ) + ' (comma separated)</label><input class="spd-input" id="' + id + '" value="' + esc( values.join( ', ' ) ) + '"></div>';
	}

	function paintProfileEdit( profile, projects ) {
		var experienceRows = profile.experience.length ? profile.experience : [ { role: '', company: '', period: '', desc: '' } ];
		var experienceHtml = experienceRows.map( function ( e, i ) {
			return '<div class="spd-panel spd-panel-tight" style="margin-bottom:10px" data-exp-row="' + i + '">' +
				'<div class="spd-field-row"><div class="spd-field"><label>Role</label><input class="spd-input exp-role" value="' + esc( e.role ) + '"></div>' +
				'<div class="spd-field"><label>Company</label><input class="spd-input exp-company" value="' + esc( e.company ) + '"></div></div>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Period</label><input class="spd-input exp-period" value="' + esc( e.period ) + '" placeholder="2021 – Present"></div>' +
				'<div class="spd-field" style="flex:2"><label>Description</label><input class="spd-input exp-desc" value="' + esc( e.desc ) + '"></div></div>' +
			'</div>';
		} ).join( '' );

		var awardRows = profile.awards.length ? profile.awards : [ { name: '', org: '', year: '', project: '' } ];
		var awardsHtml = awardRows.map( function ( a ) {
			return '<div class="spd-panel spd-panel-tight" style="margin-bottom:10px" data-award-row>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Award</label><input class="spd-input award-name" value="' + esc( a.name ) + '"></div>' +
				'<div class="spd-field"><label>Year</label><input class="spd-input award-year" value="' + esc( a.year ) + '" style="width:90px"></div></div>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Organization</label><input class="spd-input award-org" value="' + esc( a.org ) + '"></div>' +
				'<div class="spd-field"><label>Project</label><input class="spd-input award-project" value="' + esc( a.project ) + '"></div></div>' +
			'</div>';
		} ).join( '' );

		shell(
			'<div class="spd-header"><div><h1 class="spd-title">Creator Profile</h1><p class="spd-subtitle">Build your professional creative identity.</p></div></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Basics</div>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Name</label><input class="spd-input" id="pf-name" value="' + esc( profile.name ) + '"></div>' +
				'<div class="spd-field"><label>Title</label><input class="spd-input" id="pf-title" value="' + esc( profile.title ) + '"></div></div>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Company</label><input class="spd-input" id="pf-company" value="' + esc( profile.company ) + '"></div>' +
				'<div class="spd-field"><label>Location</label><input class="spd-input" id="pf-location" value="' + esc( profile.location ) + '"></div></div></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Professional Summary</div>' +
				'<div class="spd-field"><label>Professional Bio</label><textarea class="spd-input" id="pf-bio" rows="3">' + esc( profile.bio ) + '</textarea></div>' +
				'<div class="spd-field"><label>Short Bio</label><textarea class="spd-input" id="pf-short-bio" rows="2">' + esc( profile.short_bio ) + '</textarea></div>' +
				'<div class="spd-field"><label>Creative Statement</label><textarea class="spd-input" id="pf-statement" rows="2">' + esc( profile.creative_statement ) + '</textarea></div>' +
				listInputHtml( 'pf-expertise', 'Areas of Expertise', profile.expertise ) +
				'<div class="spd-field-row">' + listInputHtml( 'pf-genres', 'Genres', profile.genres ) + listInputHtml( 'pf-formats', 'Formats', profile.formats ) + '</div></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Professional Experience</div>' + experienceHtml +
				'<button type="button" class="spd-btn spd-btn-sm" id="pf-add-exp">+ Add Experience</button></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Skills</div>' + listInputHtml( 'pf-skills', 'Skills', profile.skills ) + '</div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Awards &amp; Achievements</div>' + awardsHtml +
				'<button type="button" class="spd-btn spd-btn-sm" id="pf-add-award">+ Add Award</button></div>' +
			'<div class="spd-panel"><div class="spd-panel-title">Contact Information</div>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Email</label><input class="spd-input" id="pf-email" value="' + esc( profile.email ) + '"></div>' +
				'<div class="spd-field"><label>Phone</label><input class="spd-input" id="pf-phone" value="' + esc( profile.phone ) + '"></div></div>' +
				'<div class="spd-field-row"><div class="spd-field"><label>Website</label><input class="spd-input" id="pf-website" value="' + esc( profile.website ) + '"></div>' +
				'<div class="spd-field"><label>LinkedIn</label><input class="spd-input" id="pf-linkedin" value="' + esc( profile.linkedin ) + '"></div></div>' +
				'<div class="spd-field"><label>IMDb</label><input class="spd-input" id="pf-imdb" value="' + esc( profile.imdb ) + '"></div></div>' +
			'<button class="spd-btn spd-btn-primary" id="pf-save">Save Profile</button> <button class="spd-btn" id="pf-cancel">Cancel</button>'
		);

		document.getElementById( 'pf-cancel' ).addEventListener( 'click', function () { paintProfile( profile, projects, false ); } );
		var addExpBtn = document.getElementById( 'pf-add-exp' );
		if ( addExpBtn ) { addExpBtn.addEventListener( 'click', function () { profile.experience = readExperience().concat( [ { role: '', company: '', period: '', desc: '' } ] ); paintProfileEdit( profile, projects ); } ); }
		var addAwardBtn = document.getElementById( 'pf-add-award' );
		if ( addAwardBtn ) { addAwardBtn.addEventListener( 'click', function () { profile.awards = readAwards().concat( [ { name: '', org: '', year: '', project: '' } ] ); paintProfileEdit( profile, projects ); } ); }

		function readExperience() {
			return Array.prototype.map.call( root.querySelectorAll( '[data-exp-row]' ), function ( row ) {
				return {
					role: row.querySelector( '.exp-role' ).value, company: row.querySelector( '.exp-company' ).value,
					period: row.querySelector( '.exp-period' ).value, desc: row.querySelector( '.exp-desc' ).value
				};
			} ).filter( function ( e ) { return e.role || e.company; } );
		}
		function readAwards() {
			return Array.prototype.map.call( root.querySelectorAll( '[data-award-row]' ), function ( row ) {
				return {
					name: row.querySelector( '.award-name' ).value, org: row.querySelector( '.award-org' ).value,
					year: row.querySelector( '.award-year' ).value, project: row.querySelector( '.award-project' ).value
				};
			} ).filter( function ( a ) { return a.name; } );
		}
		function listVal( id ) { return document.getElementById( id ).value.split( ',' ).map( function ( s ) { return s.trim(); } ).filter( Boolean ); }
		function val( id ) { return document.getElementById( id ).value; }

		document.getElementById( 'pf-save' ).addEventListener( 'click', function () {
			var payload = {
				name: val( 'pf-name' ), title: val( 'pf-title' ), company: val( 'pf-company' ), location: val( 'pf-location' ),
				email: val( 'pf-email' ), phone: val( 'pf-phone' ), website: val( 'pf-website' ), linkedin: val( 'pf-linkedin' ), imdb: val( 'pf-imdb' ),
				bio: val( 'pf-bio' ), short_bio: val( 'pf-short-bio' ), creative_statement: val( 'pf-statement' ),
				expertise: listVal( 'pf-expertise' ), genres: listVal( 'pf-genres' ), formats: listVal( 'pf-formats' ), skills: listVal( 'pf-skills' ),
				experience: readExperience(), awards: readAwards()
			};
			api( 'profile', { method: 'PUT', body: payload } ).then( function ( updated ) {
				toast( 'Profile saved.' );
				paintProfile( updated, projects, false );
			} ).catch( function ( e ) { toast( e.message, true ); } );
		} );
	}

	/* ---------------------------------------------------------------- */
	/* Router                                                            */
	/* ---------------------------------------------------------------- */

	var ROUTES = {
		dashboard: renderDashboard,
		projects: renderProjects,
		workspace: renderWorkspace,
		franchises: renderFranchises,
		characters: renderCharacters,
		beatsheet: renderBeatsheet,
		imports: renderImports,
		billing: renderBilling,
		profile: renderProfile
	};

	function route() {
		workspaceTab = 'Overview';
		var name = currentRoute();
		( ROUTES[ name ] || renderDashboard )();
	}

	document.addEventListener( 'keydown', function ( e ) { if ( e.key === 'Escape' ) { closeMobileNav(); } } );
	window.addEventListener( 'hashchange', route );
	route();

	/* Arriving from the homepage's "Start in the demo" field: open the New
	   Project modal pre-filled with whatever title they typed there. */
	var startTitle = new URLSearchParams( location.search ).get( 'start_title' );
	if ( startTitle ) {
		setTimeout( function () { openProjectForm( null, startTitle ); }, 300 );
	}
} )();
