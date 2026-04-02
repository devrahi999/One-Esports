import { NextResponse } from 'next/server';

/**
 * POST /api/admin/logout
 * Clear admin session cookie.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
