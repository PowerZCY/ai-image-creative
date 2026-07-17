import { NextResponse } from 'next/server';

export const MONICA_ERROR_CODE = {
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  ANONYMOUS_TRIAL_EXHAUSTED: 'ANONYMOUS_TRIAL_EXHAUSTED',
  ANONYMOUS_CREDITS_EXHAUSTED: 'ANONYMOUS_CREDITS_EXHAUSTED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
} as const;

export function monicaError(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}
