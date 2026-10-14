import { notFound } from "next/navigation";
import { getDb } from "@/lib/supabase";
import { BookingCalendar } from "@/components/BookingCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: resource } = await getDb()
    .from("resources")
    .select("id, name, description, capacity")
    .eq("id", id)
    .maybeSingle();
  if (!resource) notFound();

  return (
    <section>
      <h1 className="text-2xl font-semibold">{resource.name}</h1>
      {resource.description && <p className="mt-1 text-gray-600">{resource.description}</p>}
      <div className="mt-6">
        <BookingCalendar resourceId={resource.id} capacity={resource.capacity} />
      </div>
    </section>
  );
}
