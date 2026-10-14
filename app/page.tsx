import Link from "next/link";
import { getDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: resources, error } = await getDb()
    .from("resources")
    .select("id, name, description, capacity")
    .order("created_at", { ascending: true });

  if (error) {
    return <p className="text-red-700">Could not load resources.</p>;
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Available to book</h1>
      {resources.length === 0 ? (
        <p className="text-gray-600">Nothing listed yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {resources.map((r) => (
            <li key={r.id}>
              <Link
                href={`/calendar/${r.id}`}
                className="block rounded-lg border bg-white p-5 hover:border-gray-400"
              >
                <h2 className="font-medium">{r.name}</h2>
                {r.description && <p className="mt-1 text-sm text-gray-600">{r.description}</p>}
                <p className="mt-3 text-xs text-gray-500">Capacity: {r.capacity}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
