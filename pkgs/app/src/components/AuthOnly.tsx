import { useAuth0 } from "@auth0/auth0-react";
import { Outlet } from "react-router-dom";

/**
 * Requires Auth0 authentication only (no backend registration check).
 * Used for the /register page itself.
 */
export default function AuthOnly() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return <Outlet />;
}
