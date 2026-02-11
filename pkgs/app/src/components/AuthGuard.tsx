import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../providers/userContext";

/**
 * Protects routes that require both Auth0 authentication
 * AND backend registration (user has chosen a role).
 */
export default function AuthGuard() {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { user, isLoading: userLoading } = useUser();
  const hasTriggeredLogin = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated && !hasTriggeredLogin.current) {
      hasTriggeredLogin.current = true;
      loginWithRedirect({ appState: { returnTo: location.pathname } });
    }
  }, [authLoading, isAuthenticated, loginWithRedirect, location.pathname]);

  // Still checking auth or user state
  if (authLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Not logged in → Auth0 redirect, then return to intended page
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
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