// server.js
import express from 'express';
import cors from 'cors';
import { DateTime, Interval } from 'luxon';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { makeTransport, buildICS } from './mailer.js';

// === Konfiguracja ===
const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const transport = makeTransport();

const TZ = 'Europe/Warsaw';
const WORK_HOURS = { start: 9, end: 18 };      // 9:00–18:00
const SLOT_MINUTES = 60;                        // krok slotów
const IN_PERSON_BUFFER_MIN = 45;                // bufor przy spotkaniach na żywo
const LEAD_HOURS = { IN_PERSON: 24, ONLINE: 2, PHONE: 2 };
const MAX_RANGE_DAYS = 60;
const PUBLIC_BASE = process.env.PUBLIC_BASE || 'http://localhost:3001';

// === Helpers czasu ===
const nowZ = () => DateTime.now().setZone(TZ);
const toZdt = (iso) => DateTime.fromISO(iso, { zone: TZ });
const fmtISO = (dt) => dt.setZone(TZ).toISO({ suppressMilliseconds: true });

function genToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function roundUpToSlot(dt) {
  let d = dt.set({ second: 0, millisecond: 0 });
  const mod = d.minute % SLOT_MINUTES;
  if (mod !== 0) d = d.plus({ minutes: SLOT_MINUTES - mod });
  return d;
}

function isWorkTime(dt) {
  const isWeekday = dt.weekday >= 1 && dt.weekday <= 5;
  const inHours = dt.hour >= WORK_HOURS.start && dt.hour < WORK_HOURS.end;
  return isWeekday && inHours;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const A = Interval.fromDateTimes(aStart, aEnd);
  const B = Interval.fromDateTimes(bStart, bEnd);
  return A.overlaps(B);
}

async function getExistingBookings(rangeStart, rangeEnd) {
  try {
    return await prisma.booking.findMany({
      where: {
        startAt: { lt: rangeEnd.toJSDate() },
        endAt: { gt: rangeStart.toJSDate() },
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }
      },
      select: { startAt: true, endAt: true, type: true }
    });
  } catch (e) {
    console.error('[Prisma] booking.findMany failed:', e?.message || e);
    return []; // fallback
  }
}

function hasConflictWithBuffer(existing, newStart, newEnd, newType) {
  for (const b of existing) {
    const eStart = DateTime.fromJSDate(b.startAt).setZone(TZ);
    const eEnd = DateTime.fromJSDate(b.endAt).setZone(TZ);

    let aS = newStart, aE = newEnd;
    let bS = eStart, bE = eEnd;

    const newIsInPerson = newType === 'IN_PERSON';
    const existingIsInPerson = b.type === 'IN_PERSON';

    if (newIsInPerson) {
      aS = aS.minus({ minutes: IN_PERSON_BUFFER_MIN });
      aE = aE.plus({ minutes: IN_PERSON_BUFFER_MIN });
    }
    if (existingIsInPerson) {
      bS = bS.minus({ minutes: IN_PERSON_BUFFER_MIN });
      bE = bE.plus({ minutes: IN_PERSON_BUFFER_MIN });
    }

    if (overlaps(aS, aE, bS, bE)) return true;
  }
  return false;
}

// === Walidacje (Zod) ===
const typeSchema = z.enum(['IN_PERSON', 'ONLINE', 'PHONE']);

const bookingBodySchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(5)
  }),
  type: typeSchema,
  startAt: z.string().refine((s) => !!DateTime.fromISO(s, { zone: TZ }).isValid, 'Invalid ISO date'),
  endAt: z.string().refine((s) => !!DateTime.fromISO(s, { zone: TZ }).isValid, 'Invalid ISO date'),
  address: z.string().optional(),
  notes: z.string().optional()
}).refine((data) => {
  if (data.type === 'IN_PERSON') return !!data.address && data.address.trim().length > 3;
  return true;
}, { message: 'Address is required for IN_PERSON', path: ['address'] });

// === DEBUG: SMTP check ===
app.get('/debug/smtp', async (_req, res) => {
  try {
    await transport.verify();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message, code: e.code, response: e.response });
  }
});

// === Healthcheck ===
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: fmtISO(nowZ()) });
});

// === GET /api/slots/meta ===
app.get('/api/slots/meta', (req, res) => {
  const qType = (req.query.type || 'IN_PERSON').toString();
  const parseType = typeSchema.safeParse(qType);
  const type = parseType.success ? parseType.data : 'IN_PERSON';

  const minStart = roundUpToSlot(nowZ().plus({ hours: LEAD_HOURS[type] }));
  return res.json({
    nextAvailableAt: fmtISO(minStart),
    type,
    tz: TZ,
    slotMinutes: SLOT_MINUTES
  });
});

// === GET /api/slots ===
app.get('/api/slots', async (req, res) => {
  try {
    const qType = (req.query.type || 'IN_PERSON').toString();
    const parseType = typeSchema.safeParse(qType);
    if (!parseType.success) return res.status(400).json({ error: 'Invalid type' });
    const type = parseType.data;

    let days = Number(req.query.days || 30);
    if (!Number.isFinite(days) || days <= 0) days = 30;
    if (days > MAX_RANGE_DAYS) days = MAX_RANGE_DAYS;

    const now = nowZ();
    const lead = LEAD_HOURS[type];
    let cursor = roundUpToSlot(now.plus({ hours: lead }));
    const endRange = now.plus({ days });

    const existing = await getExistingBookings(cursor, endRange);

    const slots = [];
    while (cursor < endRange) {
      if (!isWorkTime(cursor)) {
        cursor = cursor.plus({ minutes: SLOT_MINUTES });
        continue;
      }

      const start = cursor;
      const end = cursor.plus({ minutes: SLOT_MINUTES });

      const conflict = hasConflictWithBuffer(existing, start, end, type);
      if (!conflict) {
        slots.push({
          startAt: fmtISO(start),
          endAt: fmtISO(end)
        });
      }

      cursor = cursor.plus({ minutes: SLOT_MINUTES });
    }

    res.json({ type, tz: TZ, slotMinutes: SLOT_MINUTES, slots });
  } catch (e) {
    console.error('GET /api/slots error:', e?.message, e?.stack || e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// === POST /api/booking ===
app.post('/api/booking', async (req, res) => {
  try {
    const parsed = bookingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { customer, type, startAt, endAt, address, notes } = parsed.data;

    const start = toZdt(startAt);
    const end = toZdt(endAt);
    if (!start.isValid || !end.isValid || end <= start) {
      return res.status(400).json({ error: 'Invalid time range' });
    }

    const minStart = roundUpToSlot(nowZ().plus({ hours: LEAD_HOURS[type] }));
    if (start < minStart) {
      return res.status(400).json({
        error: 'Lead time too short',
        requiredFrom: fmtISO(minStart)
      });
    }

    const existing = await getExistingBookings(start.minus({ days: 1 }), end.plus({ days: 1 }));
    const conflict = hasConflictWithBuffer(existing, start, end, type);
    if (conflict) {
      return res.status(409).json({ error: 'Slot not available' });
    }

    const upsertedCustomer = await prisma.customer.upsert({
      where: { email: customer.email },
      update: { name: customer.name, phone: customer.phone },
      create: { name: customer.name, email: customer.email, phone: customer.phone }
    });

    const booking = await prisma.booking.create({
      data: {
        customerId: upsertedCustomer.id,
        type,
        status: 'CONFIRMED',
        startAt: start.toJSDate(),
        endAt: end.toJSDate(),
        tz: TZ,
        address: type === 'IN_PERSON' ? (address || null) : null,
        notes: notes || null
      }
    });

    // Wysyłka maila z ICS
    try {
      const ics = await buildICS({
        title: `Scandura booking (${type})`,
        description: notes || '',
        location: address || '',
        startISO: start.toISO(),
        endISO: end.toISO(),
        tz: TZ
      });

      await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: customer.email,
        subject: 'Potwierdzenie rezerwacji — Scandura Homes',
        text: `Twoja rezerwacja została potwierdzona (${type}), ${fmtISO(start)} – ${fmtISO(end)}.`,
        icalEvent: { method: 'REQUEST', content: ics }
      });
    } catch (err) {
      console.error('MAIL SEND ERROR:', err.message);
    }

    res.status(201).json({
      ok: true,
      booking
    });
  } catch (e) {
    console.error('POST /api/booking error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === Start serwera ===
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Scandura booking API running on http://localhost:${PORT}`);
});
