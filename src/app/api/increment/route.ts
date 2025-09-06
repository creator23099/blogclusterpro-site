// src/app/api/usage/increment/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { incrementUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { metric = "blogs", amount = 1 } = await req.json?.() ?? {};
    if (!["blogs", "images"].includes(metric)) {
      return new NextResponse("Invalid metric", { status: 400 });
    }

    const updated = await incrementUsage(userId, metric, Number(amount) || 1);
    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    console.error("Increment usage error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}