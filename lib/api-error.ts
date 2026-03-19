export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function handleApiError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.message, code: err.code },
      { status: err.status }
    );
  }

  console.error('Unhandled API Error:', err);
  return Response.json(
    { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

import { NextResponse } from 'next/server';

export const Errors = {
  unauthorized: (msg = "Unauthorized") => NextResponse.json({ error: msg, code: "UNAUTHORIZED" }, { status: 401 }),
  internal: (msg = "Internal Server Error") => NextResponse.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 }),
  notFound: (msg = "Not Found") => NextResponse.json({ error: msg, code: "NOT_FOUND" }, { status: 404 }),
  badRequest: (msg = "Bad Request") => NextResponse.json({ error: msg, code: "BAD_REQUEST" }, { status: 400 }),
  forbidden: (msg = "Forbidden") => NextResponse.json({ error: msg, code: "FORBIDDEN" }, { status: 403 }),
};

export function successResponse(data: any = {}) {
  return NextResponse.json({ success: true, data });
}
