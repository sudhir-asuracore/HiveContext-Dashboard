import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    dedup_threshold: 0.1,
    allow_auto_approve: true,
    auto_approve_threshold: 9
  });
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Single-owner review settings are configured by the FastMCP service.' },
    { status: 405 }
  );
}
