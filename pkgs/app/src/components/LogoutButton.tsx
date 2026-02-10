import { useAuth } from '../providers/authContext';

export function LogoutButton() {
  const { logout, isLoading } = useAuth();

  return (
    <button
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      disabled={isLoading}
      className="logout-button"
    >
      Log Out
    </button>
  );
}
