// src/app/api/usage/increment/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dayjs from "dayjs";
import { db } from "@/lib/db";

type Metric = "blogs" | "images";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { metric = "blogs", amount = 1 } = (await req.json()) as {
      metric?: Metric;
      amount?: number;
    };

    if (!["blogs", "images"].includes(metric)) {
      return new NextResponse("Invalid metric", { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }

    const periodKey = dayjs().format("YYYY-MM");

    // Upsert usage row and increment atomically
    const existing = await db.usage.findUnique({
      where: { userId_metric_periodKey: { userId, metric, periodKey } },
    });

    const updated = existing
      ? await db.usage.update({
          where: { userId_metric_periodKey: { userId, metric, periodKey } },
          data: { amount: { increment: amount } },
        })
      : await db.usage.create({
          data: { userId, metric, periodKey, amount },
        });

    return NextResponse.json({
      ok: true,
      metric,
      periodKey,
      amount: updated.amount,
    });
  } catch (err) {
    console.error("usage/increment error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const periodKey = dayjs().format("YYYY-MM");
    const rows = await db.usage.findMany({
      where: { userId, periodKey },
    });
    return NextResponse.json({ ok: true, periodKey, rows });
  } catch (err) {
    console.error("usage/read error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}