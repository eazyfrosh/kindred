import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { globalSearch } from '@/lib/admin/search';
import { apiError } from '@/lib/api';

/** Global admin search. Authorization is re-checked here, not in the browser. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const term = new URL(request.url).searchParams.get('q') || '';
    if (term.trim().length < 2)
      return NextResponse.json({ campaigns: [], users: [], donations: [] });
    const results = await globalSearch(term.slice(0, 120));
    return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
