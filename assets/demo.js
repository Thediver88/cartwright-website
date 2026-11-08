/* Cartwright site: the Cut & Pack demo. Same rules as the plugin:
   round up to whole boxes, price per box rounded to pennies first. */
( function () {
	'use strict';

	var COVERAGE = 1.44;
	var PRICE_M2 = 39.9;
	var MAX_AREA = 500;
	var EPSILON = 1e-9;

	var input = document.getElementById( 'demo-area' );
	var boxesEl = document.getElementById( 'demo-boxes' );
	var keyEl = document.getElementById( 'demo-key' );
	var resultEl = document.getElementById( 'demo-result' );
	var errorEl = document.getElementById( 'demo-error' );
	if ( ! input ) {
		return;
	}

	var money = new Intl.NumberFormat( 'en-GB', { style: 'currency', currency: 'GBP' } );
	var num = function ( n ) {
		return String( Math.round( n * 100 ) / 100 );
	};

	function showError( text ) {
		errorEl.textContent = text;
		errorEl.hidden = false;
		resultEl.textContent = '';
		keyEl.textContent = '';
		boxesEl.innerHTML = '';
	}

	function update() {
		var raw = input.value.trim().replace( ',', '.' );
		var area = parseFloat( raw );

		if ( '' === raw ) {
			showError( 'Enter the area you need, for example 23.5.' );
			return;
		}
		if ( isNaN( area ) || isNaN( raw ) || area <= 0 ) {
			showError( 'Enter a number greater than zero.' );
			return;
		}
		if ( area > MAX_AREA ) {
			showError( 'In this demo the maximum is 500 m².' );
			return;
		}

		errorEl.hidden = true;

		var boxes = Math.max( 1, Math.ceil( area / COVERAGE - EPSILON ) );
		var covered = Math.round( boxes * COVERAGE * 100 ) / 100;
		var boxPrice = Math.round( COVERAGE * PRICE_M2 * 100 ) / 100;
		var spare = Math.max( 0, covered - area );
		var spareShare = spare / COVERAGE;

		// Draw up to 60 boxes; beyond that, the drawing would only get in the way.
		var shown = Math.min( boxes, 60 );
		var html = '';
		for ( var i = 0; i < shown; i++ ) {
			var last = ( i === boxes - 1 );
			var hatch = last && spareShare > 0.001 ? '<span class="spare" style="width:' + Math.round( spareShare * 100 ) + '%"></span>' : '';
			html += '<span class="box">' + hatch + '</span>';
		}
		boxesEl.innerHTML = html;

		keyEl.textContent = boxes > 60
			? 'Showing 60 of ' + boxes + ' boxes.'
			: ( spare > 0.005 ? 'Hatched: the ' + num( spare ) + ' m² left over in the last box.' : 'An exact fit, with nothing left over.' );

		resultEl.innerHTML = 'You need ' + boxes + ( 1 === boxes ? ' box' : ' boxes' ) +
			' (' + num( covered ) + ' m²) – <span class="price">' + money.format( boxes * boxPrice ) + '</span>';
	}

	input.addEventListener( 'input', update );
	update();
} )();
