/* ---------------------------------------------------------------
   Signature move: the beat sheet assembles itself as you scroll.
   The engine publishes act progress as the CSS custom property
   --sc-p on the pinned section; this reads it every frame and
   reveals real rows (real page numbers, from the actual Save the
   Cat proportions used in the plugin) rather than animating a
   pre-rendered image. Ported from includes/class-beat-templates.php
   so the numbers here match the real generator exactly.
   ------------------------------------------------------------- */
(function () {
  var TOTAL_PAGES = 110;
  var BEATS = [
    [ 'Opening Image', 1 / 110 ], [ 'Theme Stated', 5 / 110 ], [ 'Set-Up', 10 / 110 ],
    [ 'Catalyst', 12 / 110 ], [ 'Debate', 25 / 110 ], [ 'Break into Two', 25 / 110 ],
    [ 'B Story', 30 / 110 ], [ 'Fun and Games', 55 / 110 ], [ 'Midpoint', 55 / 110 ],
    [ 'Bad Guys Close In', 75 / 110 ], [ 'All Is Lost', 75 / 110 ], [ 'Dark Night of the Soul', 85 / 110 ],
    [ 'Break into Three', 85 / 110 ], [ 'Finale', 110 / 110 ], [ 'Final Image', 110 / 110 ]
  ];

  var table = document.getElementById( 'beatTable' );
  var last = 0;
  var rows = BEATS.map( function ( b, i ) {
    var page = Math.round( b[1] * TOTAL_PAGES );
    page = Math.max( last + 1, Math.min( page, TOTAL_PAGES ) );
    last = page;
    var tr = document.createElement( 'tr' );
    tr.innerHTML = '<td class="name">' + b[0] + '</td><td class="pg">' + page + '</td>';
    table.appendChild( tr );
    return tr;
  } );

  var act = document.getElementById( 'beatsheet' );
  function tick() {
    var p = parseFloat( getComputedStyle( act ).getPropertyValue( '--sc-p' ) ) || 0;
    // Reveal one row per ~6% of act progress, starting once the heading has settled.
    var visibleCount = Math.max( 0, Math.floor( ( p - 0.18 ) / 0.052 ) );
    rows.forEach( function ( tr, i ) { tr.classList.toggle( 'is-in', i < visibleCount ); } );
    requestAnimationFrame( tick );
  }
  requestAnimationFrame( tick );
})();

/* Real input, real navigation: typing a title and submitting takes it
   straight into the actual demo's New Project flow. */
document.getElementById( 'startForm' ).addEventListener( 'submit', function ( e ) {
  e.preventDefault();
  var title = document.getElementById( 'startTitle' ).value.trim();
  var url = window.SPD_DEMO_URL + ( title ? '?start_title=' + encodeURIComponent( title ) : '' );
  window.location.href = url;
} );

/* Active-tab highlight on the app-chrome strip as acts pass. */
(function () {
  // Only in-page anchors (#dashboard etc.) participate in the scroll
  // highlight — the Sign In / Google button shares this nav visually but
  // links off-page, and querySelector() throws on a full URL.
  var links = document.querySelectorAll( '.appbar__tabs a[href^="#"]' );
  var sections = Array.prototype.map.call( links, function ( a ) { return document.querySelector( a.getAttribute( 'href' ) ); } );
  function onScroll() {
    var y = window.scrollY + 80;
    var activeIndex = 0;
    sections.forEach( function ( s, i ) { if ( s && s.offsetTop <= y ) activeIndex = i; } );
    links.forEach( function ( a, i ) { a.classList.toggle( 'is-active', i === activeIndex ); } );
  }
  document.addEventListener( 'scroll', onScroll, { passive: true } );
  onScroll();
})();
