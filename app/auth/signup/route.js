import { NextResponse } from 'next/server.js';

/** Older link (signup_url of the contact API): /auth/signup → SC-04 at /signup, query kept. */
export function GET(req) {
  const url = new URL(req.url);
  return NextResponse.redirect(new URL(`/signup${url.search}`, url.origin), 308);
}
