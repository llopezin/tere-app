import { google, type calendar_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

function calendarClient(auth: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth });
}

export async function createEvent(
  auth: OAuth2Client,
  event: calendar_v3.Schema$Event,
): Promise<string> {
  const res = await calendarClient(auth).events.insert({
    calendarId: 'primary',
    sendUpdates: 'none',
    requestBody: event,
  });
  const id = res.data.id;
  if (!id) throw new Error('Google Calendar did not return an event id');
  return id;
}

export async function updateEvent(
  auth: OAuth2Client,
  eventId: string,
  event: calendar_v3.Schema$Event,
): Promise<void> {
  await calendarClient(auth).events.patch({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'none',
    requestBody: event,
  });
}

export async function deleteEvent(
  auth: OAuth2Client,
  eventId: string,
): Promise<void> {
  try {
    await calendarClient(auth).events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'none',
    });
  } catch (err: any) {
    const status = err?.response?.status ?? err?.code;
    if (status === 404 || status === 410) return;
    throw err;
  }
}
