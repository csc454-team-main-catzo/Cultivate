import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useUser } from "../providers/userContext";

export default function Layout() {
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const { user } = useUser();
  const location = useLocation();

  function navLinkClass(path: string) {
    const active = location.pathname === path || location.pathname.startsWith(path + "/");
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? "bg-gray-900 text-white"
        : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left — brand + links */}
            <div className="flex items-center gap-4">
              <Link to="/" className="text-white font-bold text-lg">
                🌱 Cultivate
              </Link>

              {/* Only show nav links if fully registered */}
              {user && (
                <div className="flex gap-2 ml-6">
                  <Link to="/listings" className={navLinkClass("/listings")}>
                    Listings
                  </Link>
                  <Link to="/listings/new" className={navLinkClass("/listings/new")}>
                    + New
                  </Link>
                </div>
              )}
            </div>

            {/* Right — auth */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {user && (
                    <span className="text-gray-400 text-xs px-2 py-0.5 bg-gray-700 rounded-full">
                      {user.role === "farmer" ? "🌾 Farmer" : "🍽️ Restaurant"}
                    </span>
                  )}
                  <span className="text-gray-300 text-sm">
                    {user?.name || user?.email}
                  </span>
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => loginWithRedirect()}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}