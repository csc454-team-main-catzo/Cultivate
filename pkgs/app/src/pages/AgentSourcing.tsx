import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import CFG from "../config";
import { useUser } from "../providers/userContext";
import { useListingActions } from "../hooks/useListingActions";
import { ChatInterface } from "../features/agent-sourcing/components/chat-interface";
import { getUserRole } from "../lib/auth";
import type { InventoryDraftData } from "../features/agent-sourcing/types";

interface GleanChatListItem {
  _id: string;
  title: string;
  role: "farmer" | "restaurant";
  createdAt: string;
  updatedAt: string;
}

export default function AgentSourcing() {
  const navigate = useNavigate();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { user } = useUser();
  const { createListing } = useListingActions();
  const role = getUserRole(user ?? null) ?? "farmer";
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [, setLoadingChats] = useState(true);
  const [chatLoadError, setChatLoadError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    if (!isAuthenticated) return null;
    const token = await getAccessTokenSilently({
      authorizationParams: { audience: CFG.AUTH0_AUDIENCE },
    });
    return { Authorization: `Bearer ${token}` };
  }, [getAccessTokenSilently, isAuthenticated]);

  async function handlePostInventory(draft: InventoryDraftData) {
    try {
      const description = (draft.description ?? "").trim() || draft.title || "Listing from Glean.";
      const body = {
        type: "supply" as const,
        title: draft.title.trim(),
        item: draft.item.trim(),
        description,
        price: draft.pricePerKg,
        qty: draft.weightKg,
        unit: (draft.unit ?? "kg") as "kg" | "lb" | "count" | "bunch",
        latLng: [0, 0] as [number, number],
        ...(draft.imageId && { photos: [{ imageId: draft.imageId }] }),
        ...(draft.deliveryWindow?.startAt &&
          draft.deliveryWindow?.endAt && {
            deliveryWindow: {
              startAt: draft.deliveryWindow.startAt,
              endAt: draft.deliveryWindow.endAt,
            },
          }),
      };
      const created = (await createListing(body)) as { _id: string };
      setPostError(null);
      navigate(`/listings/${created._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post listing.";
      console.error("Failed to post listing:", message);
      setPostError(message);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function ensureChat() {
      if (!isAuthenticated) {
        setLoadingChats(false);
        setActiveChatId(null);
        return;
      }
      setLoadingChats(true);
      setChatLoadError(null);
      try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const desiredRole = role === "restaurant" ? "restaurant" : "farmer";
        const res = await fetch(`${CFG.API_URL}/api/glean/chats/ensure`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ role: desiredRole }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Failed to load chat (${res.status})`);
        }
        const chat = (await res.json()) as GleanChatListItem;
        if (isCancelled) return;
        const id = typeof (chat as any)?._id === "string" ? (chat as any)._id : null;
        if (!id) {
          throw new Error("Failed to load chat (missing id)");
        }
        setActiveChatId(id);
      } catch (err) {
        console.error("Failed to ensure Glean chat:", err);
        if (!isCancelled) {
          const msg =
            err instanceof Error ? err.message : "Failed to load your chat.";
          setChatLoadError(msg);
          setActiveChatId(null);
        }
      } finally {
        if (!isCancelled) setLoadingChats(false);
      }
    }

    ensureChat();
    return () => {
      isCancelled = true;
    };
  }, [getAuthHeaders, isAuthenticated, role]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Glean</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Your agriculture personal assistant.
      </p>
      {chatLoadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {chatLoadError}
        </div>
      )}
      {postError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to post listing: {postError}
        </div>
      )}
      <div className="min-h-[520px]">
        <ChatInterface
          role={role}
          chatId={activeChatId}
          onPostInventory={handlePostInventory}
          onClearPostError={() => setPostError(null)}
        />
      </div>
    </div>
  );
}
