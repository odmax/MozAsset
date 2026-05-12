import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  };

  response.cookies.set('simpleUserAuth', '', clearOptions);
  response.cookies.set('session', '', clearOptions);

  return response;
}