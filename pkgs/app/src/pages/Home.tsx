import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "../providers/userContext";

/**
 * Home/landing: redirects based on auth state.
 * - Registered user → /listings
 * - Auth0 but not registered → /register
 * - Not authenticated → show simple landing with login CTA
 */
export default function Home() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { appUser: user, isLoading: userLoading } = useUser();

  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-leaf-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-earth-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/listings" replace />;
  }

  if (isAuthenticated && !user) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-leaf-50/80 via-earth-50 to-harvest-50/40" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <h1 className="font-display text-4xl sm:text-5xl text-earth-900 mb-4">
          Cultivate
        </h1>
        <p className="text-xl text-earth-600 mb-2 max-w-xl mx-auto">
          Connect farmers with restaurants. Source local, eat local.
        </p>
        <p className="text-earth-500 text-sm mb-10">
          Log in to browse listings, post offers, or post bounties.
        </p>
        <button
          type="button"
          onClick={() => loginWithRedirect()}
          className="btn-primary text-base px-6 py-3"
        >
          Get started
        </button>
        <div className="mt-16 flex justify-center gap-8 text-earth-400 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-leaf-500">🌾</span> Farmers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-harvest-500">🍽️</span> Restaurants
          </span>
        </div>
      </div>
    </div>
  );
}
