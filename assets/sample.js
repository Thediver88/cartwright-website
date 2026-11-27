/* Sample Shelf demo: pick finishes, request samples, see the limit. */
( function () {
	'use strict';
	var root = document.getElementById( 'sampledemo' );
	if ( ! root ) { return; }
	var LIMIT = 5;
	var finishes = [
		{ id: 'natural', name: 'Natural oak', color: '#d6a565' },
		{ id: 'smoked', name: 'Smoked oak', color: '#6f4e37' },
		{ id: 'grey', name: 'Grey wash', color: '#9aa0a6' },
		{ id: 'white', name: 'White oil', color: '#e8dfd0' },
		{ id: 'walnut', name: 'Dark walnut', color: '#4a3426' },
		{ id: 'honey', name: 'Honey', color: '#c98f4a' }
	];
	var selected = finishes[ 0 ];
	var taken = [];
	var swWrap = root.querySelector( '.swatches' );
	var nameEl = root.querySelector( '.sample-name b' );
	var reqBtn = root.querySelector( '[data-act="request"]' );
	var list = root.querySelector( '.sample-list' );
	var msg = root.querySelector( '.planner-msg' );
	var outCount = root.querySelector( '[data-out="count"]' );
	var outCost = root.querySelector( '[data-out="cost"]' );

	function el( tag, cls, text ) {
		var n = document.createElement( tag );
		if ( cls ) { n.className = cls; }
		if ( text ) { n.textContent = text; }
		return n;
	}
	function isTaken( f ) { return taken.indexOf( f.id ) !== -1; }

	function draw() {
		swWrap.textContent = '';
		finishes.forEach( function ( f ) {
			var b = el( 'button', 'swatch' );
			b.type = 'button';
			b.style.setProperty( '--sw', f.color );
			b.setAttribute( 'aria-label', f.name + ( isTaken( f ) ? ' (sample added)' : '' ) );
			b.setAttribute( 'aria-pressed', f === selected ? 'true' : 'false' );
			b.setAttribute( 'data-taken', isTaken( f ) ? 'true' : 'false' );
			b.addEventListener( 'click', function () { selected = f; draw(); } );
			swWrap.appendChild( b );
		} );
		nameEl.textContent = selected.name;
		var full = taken.length >= LIMIT;
		reqBtn.disabled = isTaken( selected ) || full;
		reqBtn.textContent = isTaken( selected ) ? 'Sample added' : 'Request a sample · free';

		list.textContent = '';
		if ( ! taken.length ) {
			list.appendChild( el( 'li', 'sample-empty', 'No samples yet. Pick a finish and request one.' ) );
		}
		taken.forEach( function ( id ) {
			var f = finishes.filter( function ( x ) { return x.id === id; } )[ 0 ];
			var li = el( 'li' );
			var dot = el( 'span', 'dot' );
			dot.style.setProperty( '--sw', f.color );
			li.appendChild( dot );
			li.appendChild( el( 'span', 'grow', f.name + ' · Sample' ) );
			li.appendChild( el( 'span', 'free', 'Free' ) );
			var rm = el( 'button', '', '✕' );
			rm.type = 'button';
			rm.setAttribute( 'aria-label', 'Remove ' + f.name + ' sample' );
			rm.addEventListener( 'click', function () {
				taken = taken.filter( function ( x ) { return x !== id; } );
				msg.textContent = f.name + ' sample removed.';
				draw();
			} );
			li.appendChild( rm );
			list.appendChild( li );
		} );
		outCount.textContent = taken.length + ' of ' + LIMIT;
		outCost.textContent = 'Free';
	}

	reqBtn.addEventListener( 'click', function () {
		if ( isTaken( selected ) ) { return; }
		if ( taken.length >= LIMIT ) {
			msg.textContent = 'That is the limit: ' + LIMIT + ' samples per order. You set this number yourself.';
			return;
		}
		taken.push( selected.id );
		msg.textContent = taken.length >= LIMIT ?
			'Limit reached: ' + LIMIT + ' samples per order. You set this number yourself.' :
			selected.name + ' sample added, labelled as a sample.';
		draw();
	} );
	root.querySelector( '[data-act="reset"]' ).addEventListener( 'click', function () {
		taken = [];
		msg.textContent = 'Cleared. Try it again.';
		draw();
	} );
	draw();
}() );
