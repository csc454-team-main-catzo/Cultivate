import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../providers/apiContext";

type Tab = "supply" | "demand";

interface FormState {
  title: string;
  item: string;
  description: string;
  price: string;
  qty: string;
  lat: string;
  lng: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  item: "",
  description: "",
  price: "",
  qty: "",
  lat: "",
  lng: "",
};

export default function NewListing() {
  const navigate = useNavigate();
  const { listings: listingsApi } = useApi();
  const [tab, setTab] = useState<Tab>("supply");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setForm(INITIAL_FORM);
    setError(null);
  }

  function switchTab(newTab: Tab) {
    setTab(newTab);
    resetForm();
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const lat = parseFloat(form.lat);
      const lng = parseFloat(form.lng);
      const price = parseFloat(form.price);
      const qty = parseInt(form.qty, 10);

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error("Latitude and longitude must be valid numbers");
      }
      if (isNaN(qty) || qty < 1) {
        throw new Error("Quantity must be at least 1");
      }

      if (tab === "supply") {
        // Offer: farmer posting supply
        if (!form.item.trim()) throw new Error("Item is required");
        if (!form.description.trim()) throw new Error("Description is required");
        if (isNaN(price) || price < 0) throw new Error("Price must be 0 or greater");

        await listingsApi.createListing({
          createListingRequest: {
            type: "supply",
            title: form.title.trim() || form.item.trim(),
            item: form.item.trim(),
            description: form.description.trim(),
            price,
            qty,
            latLng: [lat, lng],
          },
        });
      } else {
        // Bounty: restaurant posting demand
        if (!form.title.trim()) throw new Error("Title is required");
        if (!form.item.trim()) throw new Error("Item is required");
        if (!form.description.trim()) throw new Error("Description is required");

        await listingsApi.createListing({
          createListingRequest: {
            type: "demand",
            title: form.title.trim(),
            item: form.item.trim(),
            description: form.description.trim(),
            price: price || 0,
            qty,
            latLng: [lat, lng],
          },
        });
      }

      navigate("/listings");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Listing</h1>

      {/* Tab bar */}
      <div className="flex border-b border-gray-300 mb-6">
        <button
          type="button"
          onClick={() => switchTab("supply")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "supply"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🌾 Offer (Farmer)
        </button>
        <button
          type="button"
          onClick={() => switchTab("demand")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "demand"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🍽️ Bounty (Restaurant)
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title — always shown for Bounty, optional for Offer */}
        {tab === "demand" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Looking for organic tomatoes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={150}
            />
          </div>
        )}

        {/* Item */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.item}
            onChange={(e) => updateField("item", e.target.value)}
            placeholder="e.g. Tomatoes"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder={
              tab === "supply"
                ? "Describe your produce — variety, freshness, organic, etc."
                : "Describe what you need — variety, quality requirements, etc."
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={2000}
          />
        </div>

        {/* Price — prominent for Offer, optional for Bounty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price ($){" "}
            {tab === "supply" && <span className="text-red-500">*</span>}
            {tab === "demand" && (
              <span className="text-gray-400 text-xs">(optional — your budget)</span>
            )}
          </label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.qty}
            onChange={(e) => updateField("qty", e.target.value)}
            placeholder="e.g. 50"
            min="1"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Lat/Lng */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.lat}
              onChange={(e) => updateField("lat", e.target.value)}
              placeholder="e.g. 40.7128"
              min="-90"
              max="90"
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.lng}
              onChange={(e) => updateField("lng", e.target.value)}
              placeholder="e.g. -74.006"
              min="-180"
              max="180"
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors ${
            submitting
              ? "bg-gray-400 cursor-not-allowed"
              : tab === "supply"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting
            ? "Creating..."
            : tab === "supply"
              ? "Post Offer"
              : "Post Bounty"}
        </button>
      </form>
    </div>
  );
}