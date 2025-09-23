import nodemailer from 'nodemailer';
import { createEvent } from 'ics';

export function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,        // na 587 zawsze false
    requireTLS: true,     // wymusza STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function buildICS({ title, description, location, startISO, endISO }) {
  const s = new Date(startISO);
  const e = new Date(endISO);

  const event = {
    start: [s.getFullYear(), s.getMonth() + 1, s.getDate(), s.getHours(), s.getMinutes()],
    end:   [e.getFullYear(), e.getMonth() + 1, e.getDate(), e.getHours(), e.getMinutes()],
    title,
    description,
    location,
    calName: 'Scandura Homes',
    status: 'CONFIRMED',
    productId: 'scandura-homes/booking',
  };

  return new Promise((resolve, reject) =>
    createEvent(event, (err, val) => (err ? reject(err) : resolve(Buffer.from(val))))
  );
}
