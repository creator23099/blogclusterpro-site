// src/app/api/increment/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { incrementUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const metric = (body?.metric ?? "research").toString();
  const amount = Number(body?.amount ?? 1);

  await incrementUsage({ userId, metric, amount });

  return NextResponse.json({ ok: true });
}