import { AdminPanel } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Admin</h1>
      <AdminPanel />
    </section>
  );
}
