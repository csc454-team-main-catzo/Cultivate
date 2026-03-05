import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  getGoogleCalendarStatus,
  getGoogleCalendars,
  setGoogleCalendar,
  disconnectGoogleCalendar,
  getGoogleCalendarStartUrl,
  type GoogleCalendarStatus,
  type GoogleCalendarListResponse,
} from "../../api/integrations.js";

export default function Integrations() {
  const { getAccessTokenSilently } = useAuth0();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarListResponse["calendars"]>([]);
  const [loading, setLoading] = useState<"status" | "connect" | "disconnect" | "calendars" | "set-calendar" | null>("status");
  const [error, setError] = useState<string | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");

  const connected = status?.connected === true;
  const needsReconnect = status?.needsReconnect === true;

  useEffect(() => {
    const q = searchParams.get("googleCalendar");
    const message = searchParams.get("message");
    if (q === "connected") {
      setError(null);
      setSearchParams({}, { replace: true });
      loadStatus();
    } else if (q === "error" && message) {
      setError(decodeURIComponent(message));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function loadStatus() {
    setLoading("status");
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const data = await getGoogleCalendarStatus(token);
      setStatus(data);
      if (data.connected && data.calendarId) {
        setSelectedCalendarId(data.calendarId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load status");
      setStatus({ connected: false });
    } finally {
      setLoading(null);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    (async () => {
      setLoading("calendars");
      try {
        const token = await getAccessTokenSilently();
        const data = await getGoogleCalendars(token);
        if (!cancelled) setCalendars(data.calendars);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to list calendars");
      } finally {
        if (!cancelled) setLoading(null);
      }
    })();
    return () => { cancelled = true; };
  }, [connected, getAccessTokenSilently]);

  async function handleConnect() {
    setLoading("connect");
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(getGoogleCalendarStartUrl(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? `Server error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Could not start Google sign-in");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start connection");
    } finally {
      setLoading(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Delivery events will no longer be added.")) return;
    setLoading("disconnect");
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      await disconnectGoogleCalendar(token);
      setStatus({ connected: false });
      setCalendars([]);
      setSelectedCalendarId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setLoading(null);
    }
  }

  async function handleSetCalendar(calendarId: string) {
    setLoading("set-calendar");
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      await setGoogleCalendar(token, calendarId);
      setSelectedCalendarId(calendarId);
      setStatus((prev) => (prev ? { ...prev, calendarId } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set calendar");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl text-earth-900 mb-2">Settings</h1>
      <p className="text-earth-600 text-sm mb-6">Manage integrations and preferences.</p>

      <section className="card p-4 sm:p-6 mb-6">
        <h2 className="font-display text-lg text-earth-900 mb-1">Google Calendar</h2>
        <p className="text-sm text-earth-600 mb-4">
          Connect your Google Calendar to automatically add a calendar event for each delivery window when you place an order.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading === "status" && status === null ? (
          <div className="flex items-center gap-2 text-earth-600">
            <span className="inline-block w-5 h-5 border-2 border-earth-300 border-t-leaf-500 rounded-full animate-spin" />
            Loading…
          </div>
        ) : needsReconnect ? (
          <div className="space-y-3">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Your connection has expired. Please connect again.
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={loading === "connect"}
              className="btn-primary"
            >
              {loading === "connect" ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting…
                </>
              ) : (
                "Connect Google Calendar"
              )}
            </button>
          </div>
        ) : connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-leaf-700">
              <span className="inline-block w-3 h-3 rounded-full bg-leaf-500" />
              Connected to Google Calendar
            </div>

            <div>
              <label className="block text-sm font-medium text-earth-700 mb-1">
                Choose calendar
              </label>
              {loading === "calendars" && calendars.length === 0 ? (
                <p className="text-sm text-earth-500">Loading calendars…</p>
              ) : (
                <select
                  value={selectedCalendarId}
                  onChange={(e) => handleSetCalendar(e.target.value)}
                  disabled={loading === "set-calendar" || loading === "calendars"}
                  className="w-full max-w-sm px-3 py-2 rounded-lg border border-earth-300 bg-earth-50 text-earth-900 focus:outline-none focus:ring-2 focus:ring-leaf-400 text-sm"
                >
                  {calendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary ? "(primary)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading === "disconnect"}
              className="btn-secondary text-sm"
            >
              {loading === "disconnect" ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading === "connect"}
            className="btn-primary"
          >
            {loading === "connect" ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Connecting…
              </>
            ) : (
              "Connect Google Calendar"
            )}
          </button>
        )}
      </section>
    </div>
  );
}
