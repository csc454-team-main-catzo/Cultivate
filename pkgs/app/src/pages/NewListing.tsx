import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../providers/apiContext";
import { geocodeZipCode } from "../utils/geocode";

type Tab = "supply" | "demand";

interface FormState {
  title: string;
  item: string;
  description: string;
  price: string;
  qty: string;
  zipCode: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  item: "",
  description: "",
  price: "",
  qty: "",
  zipCode: "",
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
      const price = parseFloat(form.price);
      const qty = parseInt(form.qty, 10);
      if (isNaN(qty) || qty < 1) {
        throw new Error("Quantity must be at least 1");
      }

      const latLng = await geocodeZipCode(form.zipCode);

      if (tab === "supply") {
        if (!form.item.trim()) throw new Error("Item is required");
        if (!form.description.trim()) throw new Error("Description is required");
        if (isNaN(price) || price < 0) throw new Error("Price per unit must be 0 or greater");

        await listingsApi.createListing({
          createListingRequest: {
            type: "supply",
            title: form.title.trim() || form.item.trim(),
            item: form.item.trim(),
            description: form.description.trim(),
            price,
            qty,
            latLng,
          },
        });
      } else {
        if (!form.title.trim()) throw new Error("Title is required");
        if (!form.item.trim()) throw new Error("Item is required");
        if (!form.description.trim()) throw new Error("Description is required");

        await listingsApi.createListing({
          createListingRequest: {
            type: "demand",
            title: form.title.trim(),
            item: form.item.trim(),
            description: form.description.trim(),
            price: isNaN(price) || price < 0 ? 0 : price,
            qty,
            latLng,
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
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="font-display text-2xl sm:text-3xl text-earth-900 mb-6">
        Create listing
      </h1>

      <div className="flex border-b border-earth-200 mb-6">
        <button
          type="button"
          onClick={() => switchTab("supply")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "supply"
              ? "border-leaf-600 text-leaf-700"
              : "border-transparent text-earth-500 hover:text-earth-700"
          }`}
        >
          Offer (Farmer)
        </button>
        <button
          type="button"
          onClick={() => switchTab("demand")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "demand"
              ? "border-harvest-600 text-harvest-700"
              : "border-transparent text-earth-500 hover:text-earth-700"
          }`}
        >
          Bounty (Restaurant)
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === "demand" && (
          <div>
            <label className="block text-sm font-medium text-earth-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Looking for organic tomatoes"
              className="input-field"
              maxLength={150}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            Item <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.item}
            onChange={(e) => updateField("item", e.target.value)}
            placeholder="e.g. Tomatoes"
            className="input-field"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
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
            className="input-field resize-y min-h-[80px]"
            maxLength={2000}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            {tab === "supply"
              ? "Price per unit ($)"
              : "Your max budget per unit ($)"}{" "}
            {tab === "supply" && <span className="text-red-500">*</span>}
            {tab === "demand" && (
              <span className="text-earth-400 text-xs font-normal">(optional)</span>
            )}
          </label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="input-field"
          />
          <p className="text-earth-500 text-xs mt-1">
            {tab === "supply"
              ? "What you charge per unit (e.g. per lb, per case)."
              : "Maximum you're willing to pay per unit, if any."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.qty}
            onChange={(e) => updateField("qty", e.target.value)}
            placeholder="e.g. 50"
            min="1"
            step="1"
            className="input-field"
          />
          <p className="text-earth-500 text-xs mt-1">Number of units (e.g. lbs, cases).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-earth-700 mb-1">
            Postal code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.zipCode}
            onChange={(e) => updateField("zipCode", e.target.value)}
            placeholder="e.g. K1A 0B1"
            className="input-field"
            maxLength={10}
          />
          <p className="text-earth-500 text-xs mt-1">
            Your location (Canadian postal code). Used to help others find listings near them.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            submitting
              ? "bg-earth-300 text-earth-500 cursor-not-allowed"
              : tab === "supply"
                ? "bg-leaf-600 text-white hover:bg-leaf-700"
                : "bg-harvest-600 text-white hover:bg-harvest-700"
          }`}
        >
          {submitting
            ? "Creating..."
            : tab === "supply"
              ? "Post offer"
              : "Post bounty"}
        </button>
      </form>
    </div>
  );
}
