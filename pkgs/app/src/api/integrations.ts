import { API_URL } from "../config.js";

export interface GoogleCalendarStatus {
  connected: boolean;
  needsReconnect?: boolean;
  calendarId?: string;
}

export interface GoogleCalendarListResponse {
  calendars: Array<{ id: string; summary: string; primary?: boolean }>;
}

export async function getGoogleCalendarStatus(
  accessToken: string
): Promise<GoogleCalendarStatus> {
  const res = await fetch(`${API_URL}/api/integrations/google/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get Google Calendar status");
  return res.json();
}

export async function getGoogleCalendars(
  accessToken: string
): Promise<GoogleCalendarListResponse> {
  const res = await fetch(`${API_URL}/api/integrations/google/calendars`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to list calendars");
  }
  return res.json();
}

export async function setGoogleCalendar(
  accessToken: string,
  calendarId: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/integrations/google/calendar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ calendarId }),
  });
  if (!res.ok) throw new Error("Failed to set calendar");
}

export async function disconnectGoogleCalendar(
  accessToken: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/integrations/google/disconnect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error("Failed to disconnect");
}

/**
 * Returns the URL to start Google OAuth. Frontend should fetch with Bearer token and redirect to the returned URL.
 */
export function getGoogleCalendarStartUrl(): string {
  return `${API_URL}/api/integrations/google/start`;
}
