import { NextResponse } from 'next/server';

// Unknown API paths answer in JSON instead of rendering the HTML 404 page.
function notFound() {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
