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

/* Dashboard stat counters: auto-count once, time-based, the moment the
   section is on screen — not tied to scroll position, so it just plays like
   a looping gif rather than requiring the reader to keep dragging the
   scrollbar to watch the numbers move. Since Dashboard is the first thing on
   the page, this fires on load without any scrolling at all. */
(function () {
  var els = document.querySelectorAll( '.js-autocount' );
  if ( !els.length ) return;
  var DURATION = 900;
  function easeOutCubic( t ) { return 1 - Math.pow( 1 - t, 3 ); }
  function run( el ) {
    var target = parseFloat( el.getAttribute( 'data-count-to' ) ) || 0;
    var start = null;
    function step( ts ) {
      if ( start === null ) start = ts;
      var t = Math.min( ( ts - start ) / DURATION, 1 );
      el.textContent = String( Math.round( target * easeOutCubic( t ) ) );
      if ( t < 1 ) requestAnimationFrame( step );
    }
    requestAnimationFrame( step );
  }
  if ( 'IntersectionObserver' in window ) {
    var io = new IntersectionObserver( function ( entries ) {
      entries.forEach( function ( entry ) {
        if ( !entry.isIntersecting ) return;
        run( entry.target );
        io.unobserve( entry.target );
      } );
    }, { threshold: 0.4 } );
    Array.prototype.forEach.call( els, function ( el ) { io.observe( el ); } );
  } else {
    Array.prototype.forEach.call( els, run );
  }
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
  // Only real in-page anchors (#dashboard etc.) participate in the scroll
  // highlight. Excludes a bare "#" too, since that's not a valid ID
  // selector and third-party buttons (e.g. Nextend's Google button) render
  // one for their JS-driven click handlers rather than a real link.
  var links = Array.prototype.filter.call(
    document.querySelectorAll( '.appbar__tabs a[href^="#"]' ),
    function ( a ) { return a.getAttribute( 'href' ).length > 1; }
  );
  var sections = links.map( function ( a ) { return document.querySelector( a.getAttribute( 'href' ) ); } );
  function onScroll() {
    var y = window.scrollY + 80;
    var activeIndex = 0;
    sections.forEach( function ( s, i ) { if ( s && s.offsetTop <= y ) activeIndex = i; } );
    links.forEach( function ( a, i ) { a.classList.toggle( 'is-active', i === activeIndex ); } );
  }
  document.addEventListener( 'scroll', onScroll, { passive: true } );
  onScroll();
})();
