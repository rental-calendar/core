# Rental Calendar Core

Generic availability & booking calendar system for short-term rentals, services, equipment, parking, and more.

## Features (MVP)

- **Public Calendar View** — browse available slots/dates
- **Admin Panel** — manage resources, availability, bookings
- **Booking Confirmation** — renters reserve, owners notified
- **Multi-Resource Support** — cabins, equipment, parking, lessons, services, etc.
- **Inventory Tracking** — handle single items or N-capacity resources

## Tech Stack

- **Frontend:** Next.js + React + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase JWT
- **Calendar:** Custom calendar component

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

## MVP Scope

**In this release:**
- Public calendar (view availability)
- Admin dashboard (manage availability)
- Booking flow (reserve slot + confirmation)
- Basic inventory model

**Not in MVP:**
- Payment processing
- User authentication
- Mobile app
- Analytics

## Project Structure

```
app/
├── page.tsx              (public landing)
├── calendar/
│   └── page.tsx          (public calendar view)
├── admin/
│   ├── page.tsx          (admin login)
│   └── dashboard/
│       └── page.tsx      (admin panel)
├── api/
│   ├── resources/        (CRUD for resources)
│   ├── availability/     (manage slots)
│   ├── bookings/         (create/list bookings)
│   └── admin/            (admin endpoints)
└── components/
    ├── Calendar.tsx
    ├── BookingForm.tsx
    └── ...
```

## Open Source

MIT License. Fork, modify, self-host freely.
