import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import CFG from "../config";

export interface UpdateListingBody {
  title?: string;
  item?: string;
  description?: string;
  price?: number;
  qty?: number;
  unit?: "kg" | "lb" | "count" | "bunch";
  status?: string;
  latLng?: [number, number];
}

export interface CreateListingBody {
  type: "demand" | "supply";
  title: string;
  item: string;
  description: string;
  price: number;
  qty: number;
  unit?: "kg" | "lb" | "count" | "bunch";
  latLng: [number, number];
  photos?: Array<{ imageId: string }>;
}

export interface UploadImageResponse {
  imageId: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface DraftReason {
  desc: string;
  score: number;
  topicality?: number;
}

export interface DraftSuggestedFields {
  itemId: string | null;
  itemName: string | null;
  title: string | null;
  description: string;
  price?: number | null;
  unit?: string | null;
  priceUnit?: string | null;
  unitOptions?: string[];
  priceUnitOptions?: string[];
  quality: null;
  attributes?: Record<string, unknown> | null;
}

export interface DraftFromImageResponse {
  draftSuggestionId: string;
  imageId: string;
  suggestedFields: DraftSuggestedFields;
  confidence: number;
  reasons: DraftReason[];
}

export class ApiStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
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

  const createListing = useCallback(
    async (body: CreateListingBody) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${CFG.API_URL}/api/listings`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error || "Failed to create listing"
        );
      }
      return data;
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

  const matchListingResponse = useCallback(
    async (listingId: string, responseId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${CFG.API_URL}/listings/${listingId}/match`, {
        method: "POST",
        headers,
        body: JSON.stringify({ responseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to match response");
      }
      return res.json();
    },
    [getAuthHeaders]
  );

  const deleteListingResponse = useCallback(
    async (listingId: string, responseId: string) => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${CFG.API_URL}/listings/${listingId}/responses/${responseId}`,
        {
          method: "DELETE",
          headers,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "Failed to delete response"
        );
      }
      return res.json();
    },
    [getAuthHeaders]
  );

  const uploadImage = useCallback(
    async (file: File): Promise<UploadImageResponse> => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE },
      });
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${CFG.API_URL}/api/images/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        imageId?: string;
        filename?: string;
        mimeType?: string;
        size?: number;
      };

      if (!res.ok) {
        throw new ApiStatusError(
          res.status,
          data.error || "Failed to upload image"
        );
      }

      if (!data.imageId) {
        throw new Error("Upload response missing imageId");
      }

      return {
        imageId: data.imageId,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
      };
    },
    [getAccessTokenSilently]
  );

  const getDraft = useCallback(
    async (imageId: string): Promise<DraftFromImageResponse> => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${CFG.API_URL}/api/listings/draft-from-image`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageId }),
      });
      const data = (await res.json().catch(() => ({}))) as DraftFromImageResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new ApiStatusError(
          res.status,
          data.error || "Failed to generate draft"
        );
      }
      return data;
    },
    [getAuthHeaders]
  );

  return {
    createListing,
    updateListing,
    deleteListing,
    matchListingResponse,
    deleteListingResponse,
    uploadImage,
    getDraft,
  };
}
