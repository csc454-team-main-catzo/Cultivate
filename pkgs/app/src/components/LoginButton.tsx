import { useAuth } from '../contexts/AuthContext';

export function LoginButton() {
  const { loginWithRedirect, isLoading } = useAuth();

  return (
    <button
      onClick={() => loginWithRedirect()}
      disabled={isLoading}
      className="login-button"
    >
      {isLoading ? 'Loading...' : 'Log In'}
    </button>
  );
}
