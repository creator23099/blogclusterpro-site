import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RunButton from "./RunButton";

export default async function WriterPage() {
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, title: true, status: true, updatedAt: true },
  });

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Writer</h1>
        <RunButton />
      </div>

      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id} className="border p-3 rounded">
            <div className="font-medium">{p.title || p.slug}</div>
            <div className="text-sm opacity-70">
              {p.slug} • {p.status} • {p.updatedAt.toISOString().slice(0,16).replace("T"," ")}
            </div>
            <Link className="underline" href={`/writer/${p.slug}`}>
              Open
            </Link>
          </li>
        ))}
        {posts.length === 0 && (
          <li className="text-sm opacity-70">No posts yet. Click “Write (run n8n)” to generate one.</li>
        )}
      </ul>
    </main>
  );
}