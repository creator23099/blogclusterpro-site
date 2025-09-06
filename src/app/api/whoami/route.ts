// src/app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic"; // avoid static caching

export async function GET() {
  const { userId, sessionId } = await auth();
  return NextResponse.json(
    { userId: userId ?? null, sessionId: sessionId ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}