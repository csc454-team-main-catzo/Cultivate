import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../providers/apiContext";

interface Listing {
  _id: string;
  type: "demand" | "supply";
  title: string;
  item: string;
  description: string;
  price: number;
  qty: number;
  status: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export default function Listings() {
  const { listings: listingsApi } = useApi();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "demand" | "supply">("all");

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const config = filter === "all" ? undefined : { params: { type: filter } };
        const response = await listingsApi.listListings(config);
        // Axios wraps the payload in { data: [...] }
        const items = (response as any).data ?? response;
        setListings(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error("Failed to fetch listings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [filter, listingsApi]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Listings</h1>
        <Link
          to="/listings/new"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
        >
          + New Listing
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "demand", "supply"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f === "demand" ? "🍽️ Bounties" : "🌾 Offers"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : listings.length === 0 ? (
        <p className="text-gray-500">
          No listings yet.{" "}
          <Link to="/listings/new" className="text-blue-600 underline">
            Create one
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => (
            <div
              key={l._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
                      l.type === "demand"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {l.type === "demand" ? "Bounty" : "Offer"}
                  </span>
                  <span className="font-semibold text-gray-900">{l.title}</span>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(l.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{l.description}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>🏷️ {l.item}</span>
                <span>📦 qty: {l.qty}</span>
                <span>💰 ${l.price.toFixed(2)}</span>
                <span className="capitalize">📌 {l.status}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                by {l.createdBy?.name || "Unknown"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}