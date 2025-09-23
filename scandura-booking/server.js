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

import 'dotenv/config';

const app = express();

// ======== CORS (białe listy z .env) ========
const ALLOWED = (process.env.CORS_ORIGINS
  || 'https://scandura.com.pl,https://www.scandura.com.pl,http://127.0.0.1:5501,http://localhost:5501')
  .split(',').map(s => s.trim()).filter(Boolean);

console.log('[CORS] allowed origins:', ALLOWED);

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
app.use(express.static(path.resolve('./public')));

// ======== DB/Email ========
const prisma = new PrismaClient();
const transport = makeTransport();

// ======== USTAWIENIA ========
const TZ = process.env.TZ || 'Europe/Warsaw';
const WORK_HOURS = { start: 9, end: 18 };  // 9–18
const SLOT_MINUTES = 60;
const IN_PERSON_BUFFER_MIN = 45;
const LEAD_HOURS = { IN_PERSON: 24, ONLINE: 2, PHONE: 2 };
const MAX_RANGE_DAYS = 60;
const PUBLIC_BASE = process.env.PUBLIC_BASE || 'http://localhost:3001';

// ======== Helpery czasu ========
const nowZ  = () => DateTime.now().setZone(TZ);
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
        endAt:   { gt: rangeStart.toJSDate() },
        status:  { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }
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
    const eEnd   = DateTime.fromJSDate(b.endAt).setZone(TZ);

    let aS = newStart, aE = newEnd;
    let bS = eStart,   bE = eEnd;

    const newIsInPerson      = newType === 'IN_PERSON';
    const existingIsInPerson = b.type  === 'IN_PERSON';

    if (newIsInPerson) {
      aS = aS.minus({ minutes: IN_PERSON_BUFFER_MIN });
      aE = aE.plus ({ minutes: IN_PERSON_BUFFER_MIN });
    }
    if (existingIsInPerson) {
      bS = bS.minus({ minutes: IN_PERSON_BUFFER_MIN });
      bE = bE.plus ({ minutes: IN_PERSON_BUFFER_MIN });
    }

    if (overlaps(aS, aE, bS, bE)) return true;
  }
  return false;
}

// ======== Walidacje ========
const typeSchema = z.enum(['IN_PERSON', 'ONLINE', 'PHONE']);

const bookingBodySchema = z.object({
  customer: z.object({
    name:  z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(5)
  }),
  type: typeSchema,
  startAt: z.string().refine((s) => !!DateTime.fromISO(s, { zone: TZ }).isValid, 'Invalid ISO date'),
  endAt:   z.string().refine((s) => !!DateTime.fromISO(s, { zone: TZ }).isValid, 'Invalid ISO date'),
  address: z.string().optional(),
  notes:   z.string().optional()
}).refine((data) => {
  if (data.type === 'IN_PERSON') return !!data.address && data.address.trim().length > 3;
  return true;
}, { message: 'Address is required for IN_PERSON', path: ['address'] });

// ======== Prosty ping/health ========
app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'Scandura API', env: process.env.NODE_ENV || 'dev', time: fmtISO(nowZ()) });
});
app.get('/health', (_req, res) => res.json({ ok: true, time: fmtISO(nowZ()) }));

// ======== DEBUG SMTP ========
app.get('/debug/smtp', async (_req, res) => {
  try { await transport.verify(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, message: e.message, code: e.code, response: e.response }); }
});

// ======== GOOGLE OAUTH ========
const TOKEN_FILE = path.resolve('./google-token.json');
initGoogleOAuth();
if (fs.existsSync(TOKEN_FILE)) {
  try { setStoredTokens(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))); } catch {}
}
app.get('/auth/google', (_req, res) => {
  try { return res.redirect(getAuthUrl()); }
  catch (e) { console.error('auth/google error:', e); return res.status(500).send('OAuth init error'); }
});
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

// ======== E-mail template + helper ========
function emailTemplate({ title, preheader, heading, details = [], cta, footer = [] }) {
  const btn = cta ? `
    <tr><td align="center" style="padding:24px">
      <a href="${cta.href}" style="display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;background:#111;color:#fff">
        ${cta.label}
      </a>
    </td></tr>` : '';

  const detailRows = details.map(d => `<tr><td style="padding:6px 0;color:#111;font:500 14px/20px Inter,Arial"><strong>${d.label}:</strong> ${d.value}</td></tr>`).join('');

  const footerRows = footer.map(p => `<p style="margin:0 0 8px 0;color:#6b7280">${p}</p>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8">
  <meta name="color-scheme" content="light only"></head>
  <body style="margin:0;background:#f3f4f6">
  <div style="max-width:640px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center">
        <div style="font:700 16px Inter,Arial;color:#111">Scandura Homes</div>
        <div style="font:500 12px Inter,Arial;color:#6b7280">${title || ''}</div>
      </div>
      <div style="padding:24px">
        ${preheader ? `<p style="margin:0 0 12px 0;color:#6b7280">${preheader}</p>` : ''}
        <h1 style="margin:0 0 12px 0;font:700 20px/28px Inter,Arial;color:#111">${heading}</h1>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0">${detailRows}</table>
      </div>
      ${btn}
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6">
        ${footerRows}
        <p style="margin:6px 0 0 0;color:#9ca3af;font:12px Inter,Arial">Ta wiadomość została wysłana automatycznie. Nie odpowiadaj na nią.</p>
      </div>
    </div>
  </div>
  </body></html>`;
}

async function sendTemplatedEmail({ to, subject, templateHtml, text, icsBuffer }) {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    html: templateHtml
  };
  if (icsBuffer) {
    // zarówno icalEvent jak i zwykły załącznik – klient wybierze co wspiera najlepiej
    mailOptions.icalEvent = { method: 'REQUEST', content: icsBuffer };
    mailOptions.attachments = [{ filename: 'invite.ics', content: icsBuffer, contentType: 'text/calendar' }];
  }
  await transport.sendMail(mailOptions);
}

// ======== META SLOTÓW ========
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

// ======== LISTA SLOTÓW ========
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
      const end   = cursor.plus({ minutes: SLOT_MINUTES });

      const conflict = hasConflictWithBuffer(existing, start, end, type);
      if (!conflict) slots.push({ startAt: fmtISO(start), endAt: fmtISO(end) });

      cursor = cursor.plus({ minutes: SLOT_MINUTES });
    }

    res.json({ type, tz: TZ, slotMinutes: SLOT_MINUTES, slots });
  } catch (e) {
    console.error('GET /api/slots error:', e?.message, e?.stack || e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ======== UTWORZENIE REZERWACJI ========
app.post('/api/booking', async (req, res) => {
  try {
    const parsed = bookingBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { customer, type, startAt, endAt, address, notes } = parsed.data;

    const start = toZdt(startAt);
    const end   = toZdt(endAt);
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
    if (conflict) return res.status(409).json({ error: 'Slot not available' });

    const upsertedCustomer = await prisma.customer.upsert({
      where:  { email: customer.email },
      update: { name: customer.name, phone: customer.phone },
      create: { name: customer.name, email: customer.email, phone: customer.phone }
    });

    const booking = await prisma.booking.create({
      data: {
        customerId: upsertedCustomer.id,
        type,
        status: 'CONFIRMED',
        startAt: start.toJSDate(),
        endAt:   end.toJSDate(),
        tz: TZ,
        address: type === 'IN_PERSON' ? (address || null) : null,
        notes:   notes || null
      }
    });

    // === MAIL potwierdzenie + ICS ===
    try {
      const ics = await buildICS({
        title: `Scandura booking (${type})`,
        description: notes || '',
        location: address || '',
        startISO: start.toISO(),
        endISO:   end.toISO(),
        tz: TZ
      });

      const html = emailTemplate({
        title: 'Potwierdzenie rezerwacji',
        preheader: 'Twoja rezerwacja została przyjęta',
        heading: 'Dziękujemy — potwierdzamy termin spotkania',
        details: [
          { label: 'Rodzaj', value: type.replace('_',' ') },
          { label: 'Data', value: `${fmtISO(start)} – ${fmtISO(end)}` },
          ...(address ? [{ label: 'Adres', value: address }] : []),
          ...(notes ? [{ label: 'Notatka', value: notes }] : []),
        ],
        footer: [
          'Załączamy plik ICS — możesz dodać termin do kalendarza jednym kliknięciem.',
          'W razie potrzeby skorzystaj z linków do przełożenia/odwołania, które wyślemy w następnym mailu.'
        ]
      });

      await sendTemplatedEmail({
        to: `${customer.email}, scanduranorge@gmail.com`,
        subject: 'Potwierdzenie rezerwacji — Scandura Homes',
        text: `Twoja rezerwacja została potwierdzona (${type}), ${fmtISO(start)} – ${fmtISO(end)}.`,
        templateHtml: html,
        icsBuffer: ics
      });
    } catch (err) { console.error('MAIL SEND ERROR:', err.message); }

    // === Google Calendar
    try {
      if (hasValidAuth()) {
        const eventId = await gcCreateEvent({
          summary: `Scandura booking (${type}) – ${customer.name}`,
          description: notes || '',
          location: address || '',
          startISO: start.toISO(),
          endISO:   end.toISO(),
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

// ======== RESCHEDULE / CANCEL ========

// (a) generowanie linków (72h)
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
    const cancelUrl     = `${PUBLIC_BASE}/cancel.html?token=${encodeURIComponent(token)}`;

    try {
      const html = emailTemplate({
        title: 'Zarządzanie terminem',
        preheader: 'Linki ważne 72 godziny',
        heading: 'Linki do przełożenia lub odwołania',
        details: [
          { label: 'Aktualny termin', value: `${fmtISO(DateTime.fromJSDate(booking.startAt).setZone(TZ))} – ${fmtISO(DateTime.fromJSDate(booking.endAt).setZone(TZ))}` },
          ...(booking.address ? [{ label: 'Adres', value: booking.address }] : []),
        ],
        cta: { label: 'Przełóż termin', href: rescheduleUrl },
        footer: [
          `Jeśli chcesz odwołać: ${cancelUrl}`,
          'Linki wygasają po 72 godzinach.'
        ]
      });

      await sendTemplatedEmail({
        to: `${booking.customer.email}, scanduranorge@gmail.com`,
        subject: 'Scandura — linki do przełożenia / odwołania terminu',
        text: `Linki (72h): przełóż ${rescheduleUrl} — odwołaj ${cancelUrl}`,
        templateHtml: html
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

// (b) meta do frontu reschedule
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

// (c) przełożenie
app.post('/api/booking/reschedule', async (req, res) => {
  try {
    const { token, startAt, endAt } = req.body || {};
    const rt = await getValidTokenRow(token);
    if (!rt) return res.status(400).json({ error: 'Token invalid/expired' });

    const booking = rt.booking;
    const type = booking.type;

    const start = toZdt(startAt);
    const end   = toZdt(endAt);
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
        endAt:   end.toJSDate(),
        status: 'RESCHEDULED'
      }
    });

    await prisma.rescheduleToken.update({ where: { token }, data: { usedAt: new Date() } });

    // kalendarz
    try {
      if (hasValidAuth() && updated.googleEventId) {
        await gcUpdateEvent(updated.googleEventId, {
          summary:     `Scandura booking (${type})`,
          description: updated.notes || '',
          location:    updated.address || '',
          startISO:    DateTime.fromJSDate(updated.startAt).toISO(),
          endISO:      DateTime.fromJSDate(updated.endAt).toISO(),
          calendarId:  process.env.GOOGLE_CALENDAR_ID || 'primary'
        });
      }
    } catch (err) { console.error('Google Calendar update:', err.message); }

    // mail potwierdzający
    try {
      const html = emailTemplate({
        title: 'Przełożenie terminu',
        preheader: 'Nowy termin został zapisany',
        heading: 'Potwierdzenie przełożenia',
        details: [
          { label: 'Rodzaj', value: type.replace('_', ' ') },
          { label: 'Nowa data', value: `${fmtISO(start)} – ${fmtISO(end)}` },
          ...(updated.address ? [{ label: 'Adres', value: updated.address }] : []),
        ],
        footer: ['Do zobaczenia!']
      });

      await sendTemplatedEmail({
        to: `${booking.customer.email}, scanduranorge@gmail.com`,
        subject: 'Scandura — potwierdzenie przełożenia',
        text: `Nowy termin: ${fmtISO(start)} – ${fmtISO(end)} (${type})`,
        templateHtml: html
      });
    } catch (err) { console.error('MAIL reschedule confirm:', err.message); }

    res.json({ ok: true, booking: updated });
  } catch (e) {
    console.error('POST /api/booking/reschedule', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// (d) odwołanie
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
      const html = emailTemplate({
        title: 'Odwołanie spotkania',
        preheader: 'Termin został anulowany',
        heading: 'Potwierdzenie odwołania',
        details: [
          { label: 'Data', value: `${fmtISO(DateTime.fromJSDate(booking.startAt).setZone(TZ))} – ${fmtISO(DateTime.fromJSDate(booking.endAt).setZone(TZ))}` },
          { label: 'Rodzaj', value: booking.type.replace('_',' ') }
        ],
        footer: ['Dziękujemy za informację. W razie potrzeby umów nowy termin na stronie.']
      });

      await sendTemplatedEmail({
        to: `${booking.customer.email}, scanduranorge@gmail.com`,
        subject: 'Scandura — potwierdzenie odwołania',
        text: 'Spotkanie zostało odwołane.',
        templateHtml: html
      });
    } catch (err) { console.error('MAIL cancel confirm:', err.message); }

    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/booking/cancel', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ======== Start serwera ========
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Scandura booking API running on http://localhost:${PORT}`);
});
