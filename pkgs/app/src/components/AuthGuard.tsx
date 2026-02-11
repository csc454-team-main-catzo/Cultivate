import { useAuth0 } from "@auth0/auth0-react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../providers/userContext";

/**
 * Protects routes that require both Auth0 authentication
 * AND backend registration (user has chosen a role).
 */
export default function AuthGuard() {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { user, isLoading: userLoading } = useUser();

  // Still checking auth or user state
  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Not logged in → Auth0 redirect
  if (!isAuthenticated) {
    loginWithRedirect();
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  // Logged in but not registered → role picker
  if (!user) {
    return <Navigate to="/register" replace />;
  }

  // Fully authenticated + registered
  return <Outlet />;
}