import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './security';
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Request failed', error instanceof Error ? error.message : 'Unknown error');
  return NextResponse.json(
    { error: 'We could not complete this request. Please try again.' },
    { status: 500 },
  );
}
