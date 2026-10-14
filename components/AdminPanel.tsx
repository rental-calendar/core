"use client";

import { useCallback, useEffect, useState } from "react";

type Resource = { id: string; name: string; description: string; capacity: number };
type Blocked = { id: string; day: string };
type Booking = {
  id: string;
  resource_id: string;
  start_date: string;
  end_date: string;
  quantity: number;
  customer_name: string;
  customer_email: string;
  status: string;
};

const input = "mt-1 w-full rounded border px-2 py-1 text-sm";
const button = "rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50";

export function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCapacity, setNewCapacity] = useState(1);
  const [blockDay, setBlockDay] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [rRes, bRes] = await Promise.all([fetch("/api/resources"), fetch("/api/admin/bookings")]);
    if (bRes.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    if (rRes.ok) {
      const data = await rRes.json();
      setResources(data.resources);
      setSelected((cur) => cur || data.resources[0]?.id || "");
    }
    if (bRes.ok) setBookings((await bRes.json()).bookings);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selected || !authed) return;
    fetch(`/api/admin/blocked?resource=${selected}`)
      .then((r) => (r.ok ? r.json() : { blocked: [] }))
      .then((d) => setBlocked(d.blocked));
  }, [selected, authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password.");
      return;
    }
    setPassword("");
    loadAll();
  }

  async function createResource(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc, capacity: newCapacity }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      setNewCapacity(1);
      setMessage("Resource created.");
      loadAll();
    } else {
      setMessage("Could not create resource.");
    }
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource_id: selected, day: blockDay }),
    });
    if (res.ok) {
      setBlockDay("");
      const d = await (await fetch(`/api/admin/blocked?resource=${selected}`)).json();
      setBlocked(d.blocked);
    } else {
      setMessage("Could not block that date.");
    }
  }

  async function removeBlock(id: string) {
    await fetch(`/api/admin/blocked?id=${id}`, { method: "DELETE" });
    setBlocked((b) => b.filter((x) => x.id !== id));
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    loadAll();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
  }

  if (authed === null) return <p className="text-gray-600">Loading...</p>;

  if (!authed) {
    return (
      <form onSubmit={login} className="max-w-sm space-y-3 rounded-lg border bg-white p-5">
        <label className="block text-sm">
          Admin password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
            required
          />
        </label>
        <button type="submit" className={button}>
          Sign in
        </button>
        {loginError && <p className="text-sm text-red-700">{loginError}</p>}
      </form>
    );
  }

  const resourceName = (id: string) => resources.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Signed in.</p>
        <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
          Sign out
        </button>
      </div>
      {message && <p className="text-sm text-gray-700">{message}</p>}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-medium">Add a resource</h2>
        <form onSubmit={createResource} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Name
            <input required value={newName} onChange={(e) => setNewName(e.target.value)} className={input} />
          </label>
          <label className="text-sm">
            Capacity (units available at once)
            <input
              type="number"
              min={1}
              required
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className={input}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={input} rows={2} />
          </label>
          <div>
            <button type="submit" className={button}>
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-medium">Block dates</h2>
        <label className="mb-3 block text-sm">
          Resource
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className={input}>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={addBlock} className="flex gap-2">
          <input type="date" required value={blockDay} onChange={(e) => setBlockDay(e.target.value)} className={input} />
          <button type="submit" className={button} disabled={!selected}>
            Block
          </button>
        </form>
        <ul className="mt-4 space-y-1 text-sm">
          {blocked.map((b) => (
            <li key={b.id} className="flex items-center justify-between">
              <span>{b.day}</span>
              <button onClick={() => removeBlock(b.id)} className="text-gray-600 hover:text-gray-900">
                Unblock
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-medium">Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-600">No bookings yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-medium">
                    {resourceName(b.resource_id)} x{b.quantity}, {b.start_date} to {b.end_date}
                  </div>
                  <div className="text-gray-600">
                    {b.customer_name} &lt;{b.customer_email}&gt;
                  </div>
                </div>
                {b.status === "confirmed" ? (
                  <button onClick={() => cancelBooking(b.id)} className="text-gray-600 hover:text-gray-900">
                    Cancel
                  </button>
                ) : (
                  <span className="text-gray-500">{b.status}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
