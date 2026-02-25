import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useApi } from "../providers/apiContext";
import { useUser } from "../providers/userContext";
import CFG from "../config";

interface ChatParticipant {
  _id: string;
  name?: string;
  email?: string;
  role?: "farmer" | "restaurant";
}

interface ChatMessage {
  _id: string;
  sender: string;
  text: string;
  createdAt: string;
}

interface ChatThreadData {
  _id: string;
  listing: string;
  response: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ResponseItem {
  _id: string;
  message: string;
  price: number;
  qty: number;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

interface ListingSummary {
  _id: string;
  type: "demand" | "supply";
  title: string;
  item: string;
  description: string;
  price: number;
  qty: number;
  status: string;
  createdBy: { _id: string; name: string; email: string; role?: "farmer" | "restaurant" };
}

type LocationState = {
  listing?: ListingSummary;
  response?: ResponseItem;
  from?: "listing" | "messages";
};

export default function ChatThread() {
  const { id: threadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) || undefined;

  const { listings: listingsApi } = useApi();
  const { user } = useUser();
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();

  const [thread, setThread] = useState<ChatThreadData | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(true);

  const [listing, setListing] = useState<ListingSummary | undefined>(
    locationState?.listing
  );
  const [response] = useState<ResponseItem | undefined>(locationState?.response);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const otherParticipant = useMemo(() => {
    if (!thread || !user) return null;
    return thread.participants.find((p) => p._id !== user._id) || null;
  }, [thread, user]);

  useEffect(() => {
    if (!threadId) return;

    let isCancelled = false;
    let intervalId: number | undefined;

    async function fetchThread() {
      if (!isAuthenticated) {
        return;
      }
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: CFG.AUTH0_AUDIENCE,
          },
        });
        const res = await fetch(`${CFG.API_URL}/api/chat/threads/${threadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Failed to load chat (${res.status})`);
        }
        const data = (await res.json()) as ChatThreadData;
        if (!isCancelled) {
          setThread(data);
          setThreadError(null);
          setLoadingThread(false);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("Failed to load chat thread:", err);
        const msg =
          err instanceof Error ? err.message : "Failed to load chat. Please try again.";
        setThreadError(msg);
        setLoadingThread(false);
      }
    }

    setLoadingThread(true);
    fetchThread();
    intervalId = window.setInterval(fetchThread, 3000);

    return () => {
      isCancelled = true;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [threadId, getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    if (thread && !listing) {
      (async () => {
        try {
          const res = await listingsApi.getListing({ id: thread.listing });
          const data = (res as { data?: ListingSummary }).data ?? res;
          setListing(data as ListingSummary);
        } catch (err) {
          console.error("Failed to load listing for chat header:", err);
        }
      })();
    }
  }, [thread, listing, listingsApi]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages.length]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-earth-600 mb-4">
          You need to be logged in to view this chat.
        </p>
        <button
          type="button"
          onClick={() => loginWithRedirect()}
          className="btn-primary"
        >
          Log in
        </button>
      </div>
    );
  }

  if (loadingThread) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-leaf-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-earth-500 text-sm font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!thread || threadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-earth-600 mb-4">
          {threadError || "Chat not found or you do not have access."}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-leaf-600 font-medium hover:text-leaf-700"
        >
          ← Back
        </button>
      </div>
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !threadId) return;
    setSendError(null);
    setSending(true);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: CFG.AUTH0_AUDIENCE,
        },
      });
      const res = await fetch(`${CFG.API_URL}/api/chat/threads/${threadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: messageText.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Failed to send message (${res.status})`);
      }
      const { message } = (await res.json()) as { message: ChatMessage };
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, message],
            }
          : prev
      );
      setMessageText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to send message. Please try again.";
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }

  const listingLink = listing ? `/listings/${listing._id}` : "/listings";
  const cameFromMessages = locationState?.from === "messages";
  const backHref = cameFromMessages ? "/messages" : listingLink;
  const backLabel = cameFromMessages ? "← Back to messages" : "← Back to listing";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-earth-600 text-sm font-medium hover:text-leaf-600 mb-4"
      >
        {backLabel}
      </Link>

      {listing && (
        <article
          className="card p-4 sm:p-5 mb-4 cursor-pointer hover:bg-earth-50 transition-colors"
          onClick={() => navigate(listingLink)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h1 className="font-display text-lg sm:text-xl text-earth-900">
              {listing.title}
            </h1>
            <span className="text-xs text-earth-500 capitalize">
              {listing.status}
            </span>
          </div>
          <p className="text-earth-600 text-sm mb-2 line-clamp-2">
            {listing.description}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-earth-500">
            <span>{listing.item}</span>
            <span>Qty: {listing.qty}</span>
            <span>${listing.price.toFixed(2)}</span>
          </div>
          <p className="text-xs text-earth-400 mt-1">
            by {listing.createdBy?.name || "Unknown"}
          </p>
          {response && (
            <div className="mt-3 pt-3 border-t border-earth-200">
              <p className="text-xs uppercase tracking-wide text-earth-500 mb-1">
                Response
              </p>
              <p className="text-earth-700 text-sm whitespace-pre-wrap">
                {response.message}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-earth-500">
                <span>${response.price.toFixed(2)}</span>
                <span>Qty: {response.qty}</span>
              </div>
              <p className="text-xs text-earth-400 mt-1">
                by {response.createdBy?.name || "Unknown"} ·{" "}
                {new Date(response.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </article>
      )}

      <section className="card p-4 sm:p-5 flex flex-col h-[420px] sm:h-[480px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-earth-900">Chat</h2>
          {otherParticipant && (
            <p className="text-xs text-earth-500">
              With{" "}
              <span className="font-medium">
                {otherParticipant.name || otherParticipant.email}
              </span>
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {thread.messages.length === 0 ? (
            <p className="text-earth-500 text-sm">
              No messages yet. Start the conversation below.
            </p>
          ) : (
            thread.messages.map((m) => {
              const isMe = user && m.sender === user._id;
              return (
                <div
                  key={m._id}
                  className={`flex ${
                    isMe ? "justify-end" : "justify-start"
                  } text-sm`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      isMe
                        ? "bg-leaf-600 text-white rounded-br-sm"
                        : "bg-earth-100 text-earth-900 rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className="mt-1 text-[11px] opacity-80 text-right">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="mt-3 pt-3 border-t border-earth-200">
          {sendError && (
            <p className="text-red-600 text-xs mb-2">{sendError}</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className="input-field resize-none min-h-[44px] max-h-[72px] flex-1"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className="btn-primary px-4 py-2"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

