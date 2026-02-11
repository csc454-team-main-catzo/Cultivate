import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CFG from "../config";

export interface UpdateListingBody {
  title?: string;
  item?: string;
  description?: string;
  price?: number;
  qty?: number;
  status?: string;
  latLng?: [number, number];
}

export function useListingActions() {
  const { getAccessTokenSilently } = useAuth0();

  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessTokenSilently({
      authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
    });
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [getAccessTokenSilently]);

  const updateListing = useCallback(
    async (id: string, body: UpdateListingBody) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${CFG.API_URL}/listings/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to update listing");
      }
      return res.json();
    },
    [getAuthHeaders]
  );

  const deleteListing = useCallback(
    async (id: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${CFG.API_URL}/listings/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to delete listing");
      }
    },
    [getAuthHeaders]
  );

  return { updateListing, deleteListing };
}
