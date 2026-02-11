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
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { appUser: user, isLoading: userLoading } = useUser();

  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
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
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">🌱 Cultivate</h1>
      <p className="text-lg text-gray-600 mb-8">
        Connect farmers with restaurants. Source local, eat local.
      </p>
      <p className="text-gray-500 text-sm">
        Log in to browse listings, post offers, or post bounties.
      </p>
    </div>
  );
}
