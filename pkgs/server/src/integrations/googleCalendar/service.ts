/**
 * Google Calendar integration service: ensure valid access token, list calendars, create/update events.
 */

import type { Types } from "mongoose";
import GoogleCalendarIntegration from "../../models/GoogleCalendarIntegration.js";
import { encrypt, decrypt } from "./crypto.js";
import {
  refreshAccessToken,
  listCalendars as apiListCalendars,
  insertEvent,
  updateEvent,
  type CalendarEventInput,
  type CalendarListEntry,
} from "./googleApi.js";
import CFG from "../../config.js";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

function isExpiredSoon(expiryISO: string, bufferMinutes = 5): boolean {
  const expiry = new Date(expiryISO).getTime();
  return Date.now() >= expiry - bufferMinutes * 60 * 1000;
}

/**
 * Get a valid access token for the user's Google Calendar integration.
 * Refreshes and persists if expired. Sets needsReconnect if refresh token is missing or invalid.
 */
export async function getValidAccessToken(
  userId: Types.ObjectId
): Promise<{ accessToken: string; calendarId: string } | null> {
  const integration = await GoogleCalendarIntegration.findOne({ userId }).lean();
  if (!integration) return null;
  if (integration.needsReconnect) return null;

  let accessToken: string;
  let tokenExpiryISO = integration.tokenExpiryISO;

  if (isExpiredSoon(integration.tokenExpiryISO)) {
    const refreshEnc = integration.refreshTokenEncrypted;
    if (!refreshEnc) {
      await GoogleCalendarIntegration.updateOne(
        { userId },
        { $set: { needsReconnect: true } }
      );
      return null;
    }
    try {
      const refreshToken = decrypt(refreshEnc);
      const result = await refreshAccessToken({
        refreshToken,
        clientId: CFG.GOOGLE_CLIENT_ID,
        clientSecret: CFG.GOOGLE_CLIENT_SECRET,
      });
      accessToken = result.access_token;
      const expiry = new Date(Date.now() + result.expires_in * 1000);
      tokenExpiryISO = expiry.toISOString();
      const accessEnc = encrypt(accessToken);
      await GoogleCalendarIntegration.updateOne(
        { userId },
        { $set: { accessTokenEncrypted: accessEnc, tokenExpiryISO } }
      );
    } catch (e) {
      console.error("[googleCalendar] Token refresh failed for user", userId, (e as Error).message);
      await GoogleCalendarIntegration.updateOne(
        { userId },
        { $set: { needsReconnect: true } }
      );
      return null;
    }
  } else {
    accessToken = decrypt(integration.accessTokenEncrypted);
  }

  return { accessToken, calendarId: integration.calendarId };
}

/**
 * List calendars for the user (requires valid token).
 */
export async function listCalendarsForUser(
  userId: Types.ObjectId
): Promise<CalendarListEntry[]> {
  const tokenResult = await getValidAccessToken(userId);
  if (!tokenResult) return [];
  return apiListCalendars(tokenResult.accessToken);
}

/**
 * Create a calendar event. Returns event id or null.
 */
export async function createCalendarEvent(
  userId: Types.ObjectId,
  calendarId: string,
  accessToken: string,
  event: CalendarEventInput
): Promise<{ id: string } | null> {
  try {
    const created = await insertEvent(accessToken, calendarId, event);
    return { id: created.id };
  } catch (e) {
    console.error("[googleCalendar] createCalendarEvent failed", (e as Error).message);
    return null;
  }
}

/**
 * Update an existing calendar event.
 */
export async function updateCalendarEvent(
  userId: Types.ObjectId,
  calendarId: string,
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEventInput>
): Promise<boolean> {
  try {
    await updateEvent(accessToken, calendarId, eventId, event);
    return true;
  } catch (e) {
    console.error("[googleCalendar] updateCalendarEvent failed", (e as Error).message);
    return false;
  }
}

export { encrypt, decrypt };
