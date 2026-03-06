import { InteractiveCheckout } from "@/components/ui/interactive-checkout";

export default function InteractiveCheckoutDemo() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
        Checkout prototype
      </h1>
      <p className="text-zinc-600 text-sm mb-6">
        This is a front-end only add-to-cart and checkout prototype. It does
        not process real payments and does not write to the backend.
      </p>
      <InteractiveCheckout />
    </div>
  );
}

