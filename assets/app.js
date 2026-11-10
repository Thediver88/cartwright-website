/* Cartwright site: room planner, customer-journey tabs, setup demo.
   The maths matches the plugin: round up to whole boxes (or the cutting step),
   price of one box rounded to pennies first. */
( function () {
	'use strict';

	var EPS = 1e-9;
	var SVGNS = 'http://www.w3.org/2000/svg';
	var reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var money = new Intl.NumberFormat( 'en-GB', { style: 'currency', currency: 'GBP' } );

	function r2( n ) {
		return Math.round( n * 100 ) / 100;
	}
	function fmt( n ) {
		return String( r2( n ) );
	}
	function parse( v ) {
		v = String( v || '' ).trim().replace( ',', '.' );
		if ( '' === v || isNaN( v ) ) {
			return NaN;
		}
		return parseFloat( v );
	}
	function el( tag, attrs, parent ) {
		var e = document.createElementNS( SVGNS, tag );
		for ( var k in attrs ) {
			e.setAttribute( k, attrs[ k ] );
		}
		if ( parent ) {
			parent.appendChild( e );
		}
		return e;
	}

	/* ------------------------------------------------------------------
	 * Room planner (hero)
	 * ---------------------------------------------------------------- */
	var PRODUCTS = {
		packs: { name: 'Oak laminate', price: 39.9, coverage: 1.44 },
		cut: { name: 'Linen fabric', price: 18, step: 0.1 }
	};

	var plan = document.getElementById( 'plan' );
	if ( plan ) {
		var state = { mode: 'packs', L: 5, W: 4.7, len: 2.34 };
		var S = 68;          // pixels per metre (room)
		var SF = 80;         // pixels per metre (fabric)
		var OX = 70, OY = 62; // room origin
		var LIM = { L: [ 1, 10 ], W: [ 1, 6 ], len: [ 0.5, 8 ] };

		var fieldsEl = document.getElementById( 'fields' );
		var readoutEl = document.getElementById( 'readout' );
		var msgEl = document.getElementById( 'planner-msg' );
		var productEl = document.getElementById( 'planner-product' );
		var hintEl = document.getElementById( 'hint' );
		var dragging = false;

		var clamp = function ( v, lim ) {
			return Math.min( lim[ 1 ], Math.max( lim[ 0 ], v ) );
		};

		function calc() {
			if ( 'packs' === state.mode ) {
				var p = PRODUCTS.packs;
				var area = Math.round( state.L * state.W * 10000 ) / 10000;
				var boxes = Math.max( 1, Math.ceil( area / p.coverage - EPS ) );
				var covered = r2( boxes * p.coverage );
				return { area: area, boxes: boxes, covered: covered, spare: covered - area, total: boxes * r2( p.coverage * p.price ) };
			}
			var c = PRODUCTS.cut;
			var cutLen = Math.round( Math.ceil( state.len / c.step - EPS ) * c.step * 1000 ) / 1000;
			return { len: state.len, cut: cutLen, total: r2( cutLen * c.price ) };
		}

		function buildFields() {
			if ( 'packs' === state.mode ) {
				fieldsEl.innerHTML =
					'<div class="field"><label for="f-l">Room length</label><div class="in"><input id="f-l" inputmode="decimal" autocomplete="off"><span class="u">m</span></div></div>' +
					'<div class="field"><label for="f-w">Room width</label><div class="in"><input id="f-w" inputmode="decimal" autocomplete="off"><span class="u">m</span></div></div>';
				productEl.innerHTML = '<strong>Oak laminate</strong>, £39.90 per m², boxes of 1.44 m²';
				hintEl.textContent = 'Drag the corner to resize the room';
			} else {
				fieldsEl.innerHTML =
					'<div class="field"><label for="f-len">Length needed</label><div class="in"><input id="f-len" inputmode="decimal" autocomplete="off"><span class="u">m</span></div></div>' +
					'<div class="field"><label>Cut in steps of</label><div class="in"><input value="10 cm" disabled aria-label="Cutting step 10 cm"></div></div>';
				productEl.innerHTML = '<strong>Linen fabric</strong>, £18.00 per metre';
				hintEl.textContent = 'Drag the end of the fabric to change the length';
			}
			fieldsEl.querySelectorAll( 'input:not([disabled])' ).forEach( function ( input ) {
				input.addEventListener( 'input', onField );
			} );
			syncFields();
		}

		function syncFields( skip ) {
			var map = { 'f-l': state.L, 'f-w': state.W, 'f-len': state.len };
			Object.keys( map ).forEach( function ( id ) {
				var input = document.getElementById( id );
				if ( input && input !== skip ) {
					input.value = fmt( map[ id ] );
				}
			} );
		}

		function onField( e ) {
			var id = e.target.id;
			var key = 'f-l' === id ? 'L' : ( 'f-w' === id ? 'W' : 'len' );
			var v = parse( e.target.value );
			var lim = LIM[ key ];
			if ( isNaN( v ) || v < lim[ 0 ] || v > lim[ 1 ] ) {
				msgEl.textContent = 'In this demo, enter a number from ' + lim[ 0 ] + ' to ' + lim[ 1 ] + ' m.';
				msgEl.style.color = 'var(--bad)';
				return;
			}
			state[ key ] = v;
			render( e.target );
		}

		function renderReadout( r ) {
			if ( 'packs' === state.mode ) {
				readoutEl.innerHTML =
					'<div><dt>Area</dt><dd>' + fmt( r.area ) + ' m²</dd></div>' +
					'<div><dt>Boxes</dt><dd>' + r.boxes + '</dd></div>' +
					'<div class="total"><dt>Total</dt><dd>' + money.format( r.total ) + '</dd></div>';
				msgEl.textContent = r.spare > 0.005
					? r.boxes + ( 1 === r.boxes ? ' box covers ' : ' boxes cover ' ) + fmt( r.covered ) + ' m², with ' + fmt( r.spare ) + ' m² to spare.'
					: 'An exact fit: ' + r.boxes + ' boxes, nothing left over.';
			} else {
				readoutEl.innerHTML =
					'<div><dt>Entered</dt><dd>' + fmt( r.len ) + ' m</dd></div>' +
					'<div><dt>Cut length</dt><dd>' + fmt( r.cut ) + ' m</dd></div>' +
					'<div class="total"><dt>Total</dt><dd>' + money.format( r.total ) + '</dd></div>';
				msgEl.textContent = Math.abs( r.cut - r.len ) > 0.0005
					? 'Rounded up to the next 10 cm: ' + fmt( r.cut ) + ' m at £18.00 per metre.'
					: 'Exactly on a 10 cm step: ' + fmt( r.cut ) + ' m at £18.00 per metre.';
			}
			msgEl.style.color = '';
		}

		function defs() {
			var d = el( 'defs', {}, plan );
			// Laminate planks: 1.2 m x 0.2 m, staggered rows.
			var pw = 1.2 * S, ph = 0.2 * S;
			var pat = el( 'pattern', { id: 'planks', patternUnits: 'userSpaceOnUse', width: pw, height: ph * 2, x: OX, y: OY }, d );
			var plank = { stroke: 'rgba(40,22,6,0.35)', 'stroke-width': 0.8 };
			el( 'rect', Object.assign( { x: 0, y: 0, width: pw, height: ph, fill: '#c98f4a' }, plank ), pat );
			el( 'rect', Object.assign( { x: -pw / 2, y: ph, width: pw, height: ph, fill: '#b67c3b' }, plank ), pat );
			el( 'rect', Object.assign( { x: pw / 2, y: ph, width: pw, height: ph, fill: '#bd8442' }, plank ), pat );
			// Fabric weave.
			var wv = el( 'pattern', { id: 'weave', patternUnits: 'userSpaceOnUse', width: 8, height: 8 }, d );
			el( 'rect', { width: 8, height: 8, fill: '#7aa4c9' }, wv );
			el( 'path', { d: 'M0 4h8M4 0v8', stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 }, wv );
			// Floor grid behind everything (1 m).
			var grid = el( 'pattern', { id: 'm-grid', patternUnits: 'userSpaceOnUse', width: S, height: S, x: OX, y: OY }, d );
			el( 'path', { d: 'M ' + S + ' 0 L 0 0 0 ' + S, fill: 'none', stroke: 'rgba(214,224,245,0.06)', 'stroke-width': 1 }, grid );
		}

		function dimLine( x1, y1, x2, y2, label, vertical ) {
			var g = el( 'g', { stroke: '#e0a95e', 'stroke-width': 2, fill: 'none' }, plan );
			el( 'line', { x1: x1, y1: y1, x2: x2, y2: y2 }, g );
			if ( vertical ) {
				el( 'line', { x1: x1 - 7, y1: y1, x2: x1 + 7, y2: y1 }, g );
				el( 'line', { x1: x2 - 7, y1: y2, x2: x2 + 7, y2: y2 }, g );
			} else {
				el( 'line', { x1: x1, y1: y1 - 7, x2: x1, y2: y1 + 7 }, g );
				el( 'line', { x1: x2, y1: y2 - 7, x2: x2, y2: y2 + 7 }, g );
			}
			var tx = ( x1 + x2 ) / 2, ty = ( y1 + y2 ) / 2;
			var t = el( 'text', {
				x: tx, y: ty, fill: '#f3cd92', 'font-size': 24, 'font-weight': 700,
				'text-anchor': 'middle', 'dominant-baseline': 'central',
				transform: vertical ? 'rotate(-90 ' + tx + ' ' + ty + ')' : '',
				'paint-order': 'stroke', stroke: '#0d1322', 'stroke-width': 6
			}, plan );
			t.textContent = label;
		}

		function handle( cx, cy, label, valuetext ) {
			var g = el( 'g', { class: 'handle', tabindex: 0, role: 'slider', 'aria-label': label, 'aria-valuetext': valuetext }, plan );
			el( 'circle', { class: 'ring', cx: cx, cy: cy, r: 26, fill: 'rgba(224,169,94,0.18)', stroke: 'rgba(224,169,94,0.6)', 'stroke-width': 2 }, g );
			el( 'circle', { cx: cx, cy: cy, r: 13, fill: '#e0a95e', stroke: '#0d1322', 'stroke-width': 3 }, g );
			g.addEventListener( 'pointerdown', startDrag );
			g.addEventListener( 'keydown', onKey );
			return g;
		}

		function render( fromInput ) {
			var r = calc();
			var focused = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains( 'handle' );
			plan.innerHTML = '<title id="plan-title">Plan that updates as you change the size</title>';
			defs();
			el( 'rect', { x: 0, y: 0, width: 800, height: 500, fill: 'url(#m-grid)' }, plan );

			var h;
			if ( 'packs' === state.mode ) {
				var w = state.L * S, hgt = state.W * S;
				el( 'rect', { x: OX, y: OY, width: w, height: hgt, fill: 'url(#planks)' }, plan );
				el( 'rect', { x: OX, y: OY, width: w, height: hgt, fill: 'none', stroke: '#eef1f7', 'stroke-width': 5, 'stroke-linejoin': 'round' }, plan );
				dimLine( OX, OY - 30, OX + w, OY - 30, fmt( state.L ) + ' m', false );
				dimLine( OX - 30, OY, OX - 30, OY + hgt, fmt( state.W ) + ' m', true );
				// Area badge in the middle of the room.
				var bx = OX + w / 2, by = OY + hgt / 2;
				el( 'rect', { x: bx - 80, y: by - 26, width: 160, height: 52, rx: 12, fill: 'rgba(13,19,34,0.85)' }, plan );
				var t = el( 'text', { x: bx, y: by, fill: '#fff', 'font-size': 28, 'font-weight': 800, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, plan );
				t.textContent = fmt( r.area ) + ' m²';
				h = handle( OX + w, OY + hgt, 'Room size', fmt( state.L ) + ' by ' + fmt( state.W ) + ' metres' );
			} else {
				var y0 = 150, y1 = 310, rollX = 96;
				var endX = rollX + state.len * SF, cutX = rollX + r.cut * SF;
				// Fabric strip and roll.
				el( 'rect', { x: rollX, y: y0, width: cutX - rollX, height: y1 - y0, fill: 'url(#weave)', opacity: 0.55 }, plan );
				el( 'rect', { x: rollX, y: y0, width: endX - rollX, height: y1 - y0, fill: 'url(#weave)' }, plan );
				el( 'ellipse', { cx: rollX, cy: ( y0 + y1 ) / 2, rx: 34, ry: ( y1 - y0 ) / 2 + 6, fill: '#5e86ab', stroke: '#0d1322', 'stroke-width': 3 }, plan );
				el( 'ellipse', { cx: rollX, cy: ( y0 + y1 ) / 2, rx: 12, ry: 26, fill: '#0d1322' }, plan );
				// Cut line.
				el( 'line', { x1: cutX, y1: y0 - 22, x2: cutX, y2: y1 + 22, stroke: '#f3cd92', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, plan );
				var ct = el( 'text', { x: cutX, y: y0 - 32, fill: '#f3cd92', 'font-size': 22, 'font-weight': 700, 'text-anchor': 'middle' }, plan );
				ct.textContent = 'Cut at ' + fmt( r.cut ) + ' m';
				// Ruler.
				var rg = el( 'g', { stroke: 'rgba(214,224,245,0.45)', 'stroke-width': 1.5 }, plan );
				for ( var m = 0; m <= 8.0001; m += 0.5 ) {
					var x = rollX + m * SF, major = Math.abs( m - Math.round( m ) ) < 0.01;
					el( 'line', { x1: x, y1: y1 + 40, x2: x, y2: y1 + ( major ? 56 : 48 ) }, rg );
					if ( major ) {
						var lt = el( 'text', { x: x, y: y1 + 82, fill: '#a3aec6', 'font-size': 19, 'text-anchor': 'middle', stroke: 'none' }, plan );
						lt.textContent = m + ' m';
					}
				}
				el( 'line', { x1: rollX, y1: y1 + 40, x2: rollX + 8 * SF, y2: y1 + 40 }, rg );
				h = handle( endX, ( y0 + y1 ) / 2, 'Fabric length', fmt( state.len ) + ' metres' );
			}

			if ( focused && h ) {
				h.focus();
			}
			renderReadout( r );
			if ( ! dragging ) {
				syncFields( fromInput );
			} else {
				syncFields();
			}
		}

		function toPlan( evt ) {
			var pt = plan.createSVGPoint();
			pt.x = evt.clientX;
			pt.y = evt.clientY;
			return pt.matrixTransform( plan.getScreenCTM().inverse() );
		}

		function moveTo( evt ) {
			var p = toPlan( evt );
			if ( 'packs' === state.mode ) {
				state.L = clamp( Math.round( ( p.x - OX ) / S * 10 ) / 10, LIM.L );
				state.W = clamp( Math.round( ( p.y - OY ) / S * 10 ) / 10, LIM.W );
			} else {
				state.len = clamp( Math.round( ( p.x - 96 ) / SF * 100 ) / 100, LIM.len );
			}
			render();
		}

		function startDrag( evt ) {
			evt.preventDefault();
			dragging = true;
			hintEl.style.opacity = 0;
			var stop = function () {
				dragging = false;
				window.removeEventListener( 'pointermove', moveTo );
				window.removeEventListener( 'pointerup', stop );
				window.removeEventListener( 'pointercancel', stop );
			};
			window.addEventListener( 'pointermove', moveTo );
			window.addEventListener( 'pointerup', stop );
			window.addEventListener( 'pointercancel', stop );
		}

		function onKey( evt ) {
			var step = evt.shiftKey ? 1 : 0.1;
			var handled = true;
			if ( 'packs' === state.mode ) {
				if ( 'ArrowRight' === evt.key ) {
					state.L = clamp( r2( state.L + step ), LIM.L );
				} else if ( 'ArrowLeft' === evt.key ) {
					state.L = clamp( r2( state.L - step ), LIM.L );
				} else if ( 'ArrowDown' === evt.key ) {
					state.W = clamp( r2( state.W + step ), LIM.W );
				} else if ( 'ArrowUp' === evt.key ) {
					state.W = clamp( r2( state.W - step ), LIM.W );
				} else {
					handled = false;
				}
			} else if ( 'ArrowRight' === evt.key || 'ArrowUp' === evt.key ) {
				state.len = clamp( r2( state.len + ( evt.shiftKey ? 1 : 0.01 ) ), LIM.len );
			} else if ( 'ArrowLeft' === evt.key || 'ArrowDown' === evt.key ) {
				state.len = clamp( r2( state.len - ( evt.shiftKey ? 1 : 0.01 ) ), LIM.len );
			} else {
				handled = false;
			}
			if ( handled ) {
				evt.preventDefault();
				render();
			}
		}

		document.querySelectorAll( '.switch button' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				state.mode = btn.getAttribute( 'data-mode' );
				document.querySelectorAll( '.switch button' ).forEach( function ( b ) {
					b.setAttribute( 'aria-pressed', b === btn ? 'true' : 'false' );
				} );
				hintEl.style.opacity = 1;
				buildFields();
				render();
			} );
		} );

		buildFields();
		render();
	}

	/* ------------------------------------------------------------------
	 * Customer-journey tabs
	 * ---------------------------------------------------------------- */
	var tabs = Array.prototype.slice.call( document.querySelectorAll( '[role="tab"]' ) );
	function select( tab, focus ) {
		tabs.forEach( function ( t ) {
			var on = t === tab;
			t.setAttribute( 'aria-selected', on ? 'true' : 'false' );
			t.tabIndex = on ? 0 : -1;
			document.getElementById( t.getAttribute( 'aria-controls' ) ).hidden = ! on;
		} );
		if ( focus ) {
			tab.focus();
		}
	}
	tabs.forEach( function ( tab, i ) {
		tab.addEventListener( 'click', function () {
			select( tab );
		} );
		tab.addEventListener( 'keydown', function ( e ) {
			var n = null;
			if ( 'ArrowDown' === e.key || 'ArrowRight' === e.key ) {
				n = tabs[ ( i + 1 ) % tabs.length ];
			} else if ( 'ArrowUp' === e.key || 'ArrowLeft' === e.key ) {
				n = tabs[ ( i - 1 + tabs.length ) % tabs.length ];
			}
			if ( n ) {
				e.preventDefault();
				select( n, true );
			}
		} );
	} );

	// One moment of motion: the product mock "types" 23.5 the first time it scrolls into view.
	var typeTarget = document.getElementById( 'type-target' );
	var typeResult = document.getElementById( 'type-result' );
	if ( typeTarget && ! reduceMotion && 'IntersectionObserver' in window ) {
		var finalText = typeResult.textContent;
		typeTarget.textContent = '';
		typeResult.style.visibility = 'hidden';
		var io = new IntersectionObserver( function ( entries ) {
			if ( ! entries[ 0 ].isIntersecting ) {
				return;
			}
			io.disconnect();
			var chars = '23.5'.split( '' ), i = 0;
			var tick = setInterval( function () {
				typeTarget.textContent += chars[ i++ ];
				if ( i === chars.length ) {
					clearInterval( tick );
					typeResult.textContent = finalText;
					typeResult.style.visibility = '';
				}
			}, 260 );
		}, { threshold: 0.6 } );
		io.observe( typeTarget );
	}

	/* ------------------------------------------------------------------
	 * Setup demo
	 * ---------------------------------------------------------------- */
	var sPrice = document.getElementById( 's-price' );
	if ( sPrice ) {
		var sSize = document.getElementById( 's-size' );
		var sEnabled = document.getElementById( 's-enabled' );
		var sMode = 'packs';
		var DEFAULTS = {
			packs: { price: '39.90', size: '1.44', priceLabel: 'Price per m²', sizeLabel: 'Coverage per box', sizeUnit: 'm²', name: 'Oak Laminate', unit: 'm²', example: 23.5, q: 'How many m² do you need?' },
			cut: { price: '18.00', size: '0.1', priceLabel: 'Price per metre', sizeLabel: 'Cutting step', sizeUnit: 'm', name: 'Linen Fabric', unit: 'm', example: 2.34, q: 'How many metres do you need?' }
		};

		var update = function () {
			var d = DEFAULTS[ sMode ];
			var price = parse( sPrice.value ), size = parse( sSize.value );
			var res = document.getElementById( 'p-result' );
			document.getElementById( 'p-name' ).textContent = d.name;
			document.getElementById( 'p-entered' ).textContent = String( d.example );
			document.getElementById( 'p-unit' ).textContent = d.unit;
			document.getElementById( 's-example' ).textContent = d.example + ' ' + d.unit;

			if ( ! sEnabled.checked ) {
				document.getElementById( 'p-price' ).textContent = isNaN( price ) ? '' : money.format( price );
				document.getElementById( 'p-q' ).textContent = 'Quantity';
				document.getElementById( 'p-entered' ).textContent = '1';
				document.getElementById( 'p-unit' ).textContent = '';
				res.textContent = 'Calculator off: customers pick a quantity, as usual.';
				return;
			}

			document.getElementById( 'p-q' ).textContent = d.q;
			if ( isNaN( price ) || isNaN( size ) || price <= 0 || size <= 0 ) {
				document.getElementById( 'p-price' ).textContent = '';
				res.textContent = 'Enter a price and a ' + ( 'packs' === sMode ? 'box size' : 'step' ) + ' above zero.';
				return;
			}
			document.getElementById( 'p-price' ).textContent = money.format( price ) + ' / ' + d.unit;

			if ( 'packs' === sMode ) {
				var boxes = Math.max( 1, Math.ceil( d.example / size - EPS ) );
				res.textContent = 'You need ' + boxes + ( 1 === boxes ? ' box' : ' boxes' ) + ' (' + fmt( boxes * size ) + ' m²) – ' + money.format( boxes * r2( size * price ) );
			} else {
				var cut = Math.round( Math.ceil( d.example / size - EPS ) * size * 1000 ) / 1000;
				res.textContent = fmt( cut ) + ' m – ' + money.format( r2( cut * price ) );
			}
		};

		document.querySelectorAll( '[data-smode]' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				sMode = btn.getAttribute( 'data-smode' );
				document.querySelectorAll( '[data-smode]' ).forEach( function ( b ) {
					b.setAttribute( 'aria-pressed', b === btn ? 'true' : 'false' );
				} );
				var d = DEFAULTS[ sMode ];
				sPrice.value = d.price;
				sSize.value = d.size;
				document.getElementById( 's-price-label' ).textContent = d.priceLabel;
				document.getElementById( 's-size-label' ).textContent = d.sizeLabel;
				document.getElementById( 's-size-unit' ).textContent = d.sizeUnit;
				update();
			} );
		} );
		[ sPrice, sSize ].forEach( function ( i ) {
			i.addEventListener( 'input', update );
		} );
		sEnabled.addEventListener( 'change', update );
		update();
	}
} )();
