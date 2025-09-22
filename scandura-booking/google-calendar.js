// google-calendar.js
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
let oauth;

/** Inicjalizacja klienta OAuth2 z ENV */
export function initGoogleOAuth() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Brak GOOGLE_* w ENV (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)');
  }
  oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  return oauth;
}

function ensureOAuth() {
  if (!oauth) throw new Error('OAuth nie został zainicjalizowany. Wywołaj initGoogleOAuth() przy starcie serwera.');
}

/** URL zgody Google */
export function getAuthUrl() {
  ensureOAuth();
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });
}

/** Wymiana code -> tokens i ustawienie poświadczeń */
export async function setTokensFromCode(code) {
  ensureOAuth();
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);
  return tokens;
}

/** Ustawienie zapisanych tokenów z pliku */
export function setStoredTokens(tokens) {
  ensureOAuth();
  if (tokens) oauth.setCredentials(tokens);
}

/** Czy mamy ważne poświadczenia? */
export function hasValidAuth() {
  const c = oauth?.credentials || {};
  return Boolean(c.refresh_token || c.access_token);
}

function calendar() {
  ensureOAuth();
  return google.calendar({ version: 'v3', auth: oauth });
}

/**
 * Utwórz wydarzenie w Google Calendar.
 * @param {Object} params
 * @param {string} params.summary
 * @param {string} [params.description]
 * @param {string} [params.location]
 * @param {string} params.startISO - ISO datetime (np. 2025-09-22T10:00:00+02:00)
 * @param {string} params.endISO   - ISO datetime
 * @param {string} [params.calendarId='primary']
 * @param {string[]} [params.attendees] - lista e-maili uczestników (opcjonalnie)
 */
export async function gcCreateEvent({
  summary, description, location, startISO, endISO,
  calendarId = 'primary', attendees = []
}) {
  try {
    const resource = {
      summary,
      description,
      location,
      start: { dateTime: startISO, timeZone: 'Europe/Warsaw' },
      end:   { dateTime: endISO,   timeZone: 'Europe/Warsaw' }
    };
    if (Array.isArray(attendees) && attendees.length) {
      resource.attendees = attendees.map(email => ({ email }));
    }
    const res = await calendar().events.insert({ calendarId, resource });
    return res.data.id;
  } catch (err) {
    console.error('gcCreateEvent error:', err?.message || err);
    throw err;
  }
}

/**
 * Zaktualizuj wydarzenie.
 * Parametry jak wyżej + eventId (wymagany).
 */
export async function gcUpdateEvent(eventId, {
  summary, description, location, startISO, endISO,
  calendarId = 'primary', attendees = []
}) {
  try {
    const resource = {
      summary,
      description,
      location,
      start: { dateTime: startISO, timeZone: 'Europe/Warsaw' },
      end:   { dateTime: endISO,   timeZone: 'Europe/Warsaw' }
    };
    if (Array.isArray(attendees) && attendees.length) {
      resource.attendees = attendees.map(email => ({ email }));
    }
    await calendar().events.update({ calendarId, eventId, resource });
  } catch (err) {
    console.error('gcUpdateEvent error:', err?.message || err);
    throw err;
  }
}

/** Usuń wydarzenie */
export async function gcDeleteEvent(eventId, calendarId = 'primary') {
  try {
    await calendar().events.delete({ calendarId, eventId });
  } catch (err) {
    // jeśli event nie istnieje, nie traktuj jako błąd krytyczny
    if (err?.code === 404) {
      console.warn('gcDeleteEvent: event not found (404) — ignoruję.');
      return;
    }
    console.error('gcDeleteEvent error:', err?.message || err);
    throw err;
  }
}
