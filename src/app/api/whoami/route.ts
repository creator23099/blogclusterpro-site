// src/app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, sessionId } = await auth();
  return NextResponse.json({ userId, sessionId }, { headers: { "Cache-Control": "no-store" } });
}