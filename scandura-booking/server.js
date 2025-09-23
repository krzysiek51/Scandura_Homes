// server.js
import express from 'express';
import cors from 'cors';
import { DateTime, Interval } from 'luxon';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { makeTransport, buildICS } from './mailer.js';
import fs from 'node:fs';
import path from 'node:path';
import {
  initGoogleOAuth, getAuthUrl, setTokensFromCode,
  setStoredTokens, hasValidAuth, gcCreateEvent,
  gcUpdateEvent, gcDeleteEvent
} from './google-calendar.js';

/// === Konfiguracja ===
import 'dotenv/config';

const app = express();

// WHITELIST z .env (prod + lokal)
const ALLOWED = (process.env.CORS_ORIGINS
  || 'https://scandura.com.pl,https://www.scandura.com.pl,http://127.0.0.1:5501,http://localhost:5501')
  .split(',').map(s => s.trim()).filter(Boolean);

console.log('[CORS] allowed origins:', ALLOWED);

// TWARDY middleware – ustawia nagłówki na KAŻDEJ odpowiedzi
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json());

// serwuj statyki (mini-front /reschedule.html, /cancel.html)
app.use(express.static(path.resolve('./public')));

const prisma = new PrismaClient();
const transport = makeTransport();

const TZ = 'Europe/Warsaw';
const WORK_HOURS = { start: 9, end: 18 };  // 9:00–18:00
const SLOT_MINUTES = 60;                    // krok slotów
const IN_PERSON_BUFFER_MIN = 45;            // bufor przy spotkaniach na żywo
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
    return [];
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

// === Root (ping) ===
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'Scandura API',
    env: process.env.NODE_ENV || 'dev',
    time: fmtISO(nowZ())
  });
});

// === Healthcheck ===
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: fmtISO(nowZ()) });
});

// === DEBUG: SMTP check ===
app.get('/debug/smtp', async (_req, res) => {
  try {
    await transport.verify();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message, code: e.code, response: e.response });
  }
});

// === GOOGLE OAUTH INIT + ROUTES ===
const TOKEN_FILE = path.resolve('./google-token.json');
initGoogleOAuth();
if (fs.existsSync(TOKEN_FILE)) {
  try { setStoredTokens(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))); } catch { }
}

// Start OAuth – przekierowanie do Google
app.get('/auth/google', (_req, res) => {
  try { return res.redirect(getAuthUrl()); }
  catch (e) {
    console.error('auth/google error:', e);
    return res.status(500).send('OAuth init error');
  }
});

// Callback z Google – zapis tokenów
app.get('/oauth2callback', async (req, res) => {
  try {
    const code = req.query.code?.toString();
    if (!code) return res.status(400).send('Brak code');
    const tokens = await setTokensFromCode(code);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    return res.send('✅ Google Calendar podłączony. Możesz zamknąć tę kartę.');
  } catch (e) {
    console.error('oauth2callback error:', e);
    return res.status(500).send('OAuth callback error');
  }
});

// === GET /api/slots/meta ===
app.get('/api/slots/meta', (req, res) => {
  const qType = (req.query.type || 'IN_PERSON').toString();
  const parseType = typeSchema.safeParse(qType);
  const type = parseType.success ? parseType.data : 'IN_PERSON';

  const minStart = roundUpToSlot(nowZ().plus({ hours: LEAD_HOURS[type] }));

  // wyłącz cache
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  return res.json({
    nextAvailableAt: fmtISO(minStart),
    type,
    tz: TZ,
    slotMinutes: SLOT_MINUTES,
  });
});

// === GET /api/slots ===  (pobieranie z "padem" + no-cache)
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

    // Klucz: pobierz istniejące z zapasem PAD_MIN (45m)
    const PAD_MIN = IN_PERSON_BUFFER_MIN;
    const existing = await getExistingBookings(
      cursor.minus({ minutes: PAD_MIN }),
      endRange.plus({ minutes: PAD_MIN })
    );

    const slots = [];
    while (cursor < endRange) {
      if (!isWorkTime(cursor)) {
        cursor = cursor.plus({ minutes: SLOT_MINUTES });
        continue;
      }

      const start = cursor;
      const end = cursor.plus({ minutes: SLOT_MINUTES });

      const conflict = hasConflictWithBuffer(existing, start, end, type);
      if (!conflict) slots.push({ startAt: fmtISO(start), endAt: fmtISO(end) });

      cursor = cursor.plus({ minutes: SLOT_MINUTES });
    }

    // wyłącz cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.json({ type, tz: TZ, slotMinutes: SLOT_MINUTES, slots });
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

    const PAD_MIN = IN_PERSON_BUFFER_MIN;
    const existing = await getExistingBookings(
      start.minus({ minutes: PAD_MIN }),
      end.plus({ minutes: PAD_MIN })
    );
    const conflict = hasConflictWithBuffer(existing, start, end, type);
    if (conflict) return res.status(409).json({ error: 'Slot not available' });

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

    // Mail + ICS
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
        to: `${customer.email}, scanduranorge@gmail.com`,
        subject: '✅ Potwierdzenie rezerwacji — Scandura Homes',
        html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border-radius:8px;border:1px solid #eee;background:#fafafa;color:#111;line-height:1.5">
        <h2 style="color:#0057b7;margin-top:0">Potwierdzenie rezerwacji</h2>
        <p>Dziękujemy, <strong>${customer.name}</strong>!</p>
        <p>Twoja rezerwacja została potwierdzona:</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:6px 12px;font-weight:bold">Rodzaj:</td>
            <td style="padding:6px 12px">${type === 'IN_PERSON' ? 'Spotkanie na żywo' : type}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;font-weight:bold">Data i godzina:</td>
            <td style="padding:6px 12px">${fmtISO(start)} – ${fmtISO(end)}</td>
          </tr>
          ${address ? `
          <tr>
            <td style="padding:6px 12px;font-weight:bold">Adres:</td>
            <td style="padding:6px 12px">${address}</td>
          </tr>` : ''}
        </table>
        <p>W załączniku znajdziesz plik kalendarza (.ics), który możesz dodać do swojego Google/Outlook/Apple Calendar.</p>
        <p style="margin-top:20px">Do zobaczenia!<br><strong>Zespół Scandura Homes</strong></p>
      </div>
    `,
        icalEvent: { method: 'REQUEST', content: ics }
      });
    } catch (err) { console.error('MAIL SEND ERROR:', err.message); }

    // Google Calendar — utwórz event i zapisz ID
    try {
      if (hasValidAuth()) {
        const eventId = await gcCreateEvent({
          summary: `Scandura booking (${type}) – ${customer.name}`,
          description: notes || '',
          location: address || '',
          startISO: start.toISO(),
          endISO: end.toISO(),
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
        });
        await prisma.booking.update({ where: { id: booking.id }, data: { googleEventId: eventId } });
      } else {
        console.warn('Google Calendar niepodłączony — otwórz /auth/google');
      }
    } catch (err) { console.error('Google Calendar create error:', err?.message || err); }

    res.status(201).json({ ok: true, booking });
  } catch (e) {
    console.error('POST /api/booking error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ======== RESCHEDULE / CANCEL – HELPERS & ENDPOINTS ========

// (a) Generowanie i mailowanie linków (72h)
app.post('/api/booking/:id/reschedule-link', async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { customer: true }
    });
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const token = genToken();
    const expiresAt = nowZ().plus({ hours: 72 }).toJSDate();

    await prisma.rescheduleToken.create({
      data: { bookingId: booking.id, token, expiresAt }
    });

    const rescheduleUrl = `${PUBLIC_BASE}/reschedule.html?token=${encodeURIComponent(token)}`;
    const cancelUrl = `${PUBLIC_BASE}/cancel.html?token=${encodeURIComponent(token)}`;

    try {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Linki do zarządzania terminem</h2>
          <p>Witaj ${booking.customer.name},</p>
          <p>Linki ważne 72 godziny:</p>
          <p>Przełóż: <a href="${rescheduleUrl}">${rescheduleUrl}</a></p>
          <p>Odwołaj: <a href="${cancelUrl}">${cancelUrl}</a></p>
        </div>`;
      await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: `${booking.customer.email}, scanduranorge@gmail.com`,
        subject: 'Scandura — linki do przełożenia / odwołania terminu',
        html
      });
    } catch (err) { console.error('MAIL reschedule-link:', err.message); }

    res.json({ ok: true, rescheduleUrl, cancelUrl, token });
  } catch (e) {
    console.error('POST /api/booking/:id/reschedule-link', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// helper: walidacja tokenu
async function getValidTokenRow(token) {
  const row = await prisma.rescheduleToken.findUnique({
    where: { token },
    include: { booking: { include: { customer: true } } }
  });
  if (!row) return null;
  if (row.usedAt) return null;
  if (DateTime.fromJSDate(row.expiresAt) < nowZ()) return null;
  return row;
}

// (b) Meta do frontu reschedule
app.get('/api/reschedule-meta', async (req, res) => {
  try {
    const token = req.query.token?.toString() || '';
    const row = await getValidTokenRow(token);
    if (!row) return res.status(400).json({ error: 'Token invalid/expired' });
    const b = row.booking;
    res.json({
      ok: true,
      booking: {
        id: b.id,
        type: b.type,
        startAt: b.startAt,
        endAt: b.endAt,
        address: b.address,
        name: b.customer.name
      }
    });
  } catch (e) {
    console.error('GET /api/reschedule-meta', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// (c) Przełożenie
app.post('/api/booking/reschedule', async (req, res) => {
  try {
    const { token, startAt, endAt } = req.body || {};
    const rt = await getValidTokenRow(token);
    if (!rt) return res.status(400).json({ error: 'Token invalid/expired' });

    const booking = rt.booking;
    const type = booking.type;

    const start = toZdt(startAt);
    const end = toZdt(endAt);
    if (!start.isValid || !end.isValid || end <= start) {
      return res.status(400).json({ error: 'Invalid time range' });
    }
    const minStart = roundUpToSlot(nowZ().plus({ hours: LEAD_HOURS[type] }));
    if (start < minStart) {
      return res.status(400).json({ error: 'Lead time too short', requiredFrom: fmtISO(minStart) });
    }
    const existing = await getExistingBookings(start.minus({ days: 1 }), end.plus({ days: 1 }));
    if (hasConflictWithBuffer(existing, start, end, type)) {
      return res.status(409).json({ error: 'Slot not available' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        startAt: start.toJSDate(),
        endAt: end.toJSDate(),
        status: 'RESCHEDULED'
      }
    });

    await prisma.rescheduleToken.update({ where: { token }, data: { usedAt: new Date() } });

    // Kalendarz
    try {
      if (hasValidAuth() && updated.googleEventId) {
        await gcUpdateEvent(updated.googleEventId, {
          summary: `Scandura booking (${type})`,
          description: updated.notes || '',
          location: updated.address || '',
          startISO: DateTime.fromJSDate(updated.startAt).toISO(),
          endISO: DateTime.fromJSDate(updated.endAt).toISO(),
          calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary'
        });
      }
    } catch (err) { console.error('Google Calendar update:', err.message); }

    // mail potwierdzający
    try {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Termin został przełożony</h2>
          <p>${booking.customer.name}, potwierdzamy nowy termin:</p>
          <p><strong>${fmtISO(start)} – ${fmtISO(end)}</strong> (${type})</p>
        </div>`;
      await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: `${booking.customer.email}, scanduranorge@gmail.com`,
        subject: 'Scandura — potwierdzenie przełożenia',
        html
      });
    } catch (err) { console.error('MAIL reschedule confirm:', err.message); }

    res.json({ ok: true, booking: updated });
  } catch (e) {
    console.error('POST /api/booking/reschedule', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// (d) Odwołanie
app.post('/api/booking/cancel', async (req, res) => {
  try {
    const { token } = req.body || {};
    const rt = await getValidTokenRow(token);
    if (!rt) return res.status(400).json({ error: 'Token invalid/expired' });

    const booking = rt.booking;

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    await prisma.rescheduleToken.update({ where: { token }, data: { usedAt: new Date() } });

    try {
      if (hasValidAuth() && updated.googleEventId) {
        await gcDeleteEvent(updated.googleEventId, process.env.GOOGLE_CALENDAR_ID || 'primary');
      }
    } catch (err) { console.error('Google Calendar delete:', err.message); }

    try {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Spotkanie zostało odwołane</h2>
          <p>Dziękujemy za informację. W razie potrzeby umów nowy termin na stronie.</p>
        </div>`;
      await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: `${booking.customer.email}, scanduranorge@gmail.com`,
        subject: 'Scandura — potwierdzenie odwołania',
        html
      });
    } catch (err) { console.error('MAIL cancel confirm:', err.message); }

    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/booking/cancel', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === Start serwera ===
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Scandura booking API running on http://localhost:${PORT}`);
});
