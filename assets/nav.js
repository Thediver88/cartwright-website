( function () {
	var menu = document.querySelector( '.site-nav .menu' );
	if ( ! menu ) { return; }
	document.addEventListener( 'click', function ( e ) {
		if ( ! menu.contains( e.target ) ) { menu.removeAttribute( 'open' ); }
	} );
	document.addEventListener( 'keydown', function ( e ) {
		if ( 'Escape' === e.key ) { menu.removeAttribute( 'open' ); }
	} );
} )();
