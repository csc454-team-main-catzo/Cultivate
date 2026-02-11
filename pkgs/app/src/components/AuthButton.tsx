import { useAuth0 } from '@auth0/auth0-react';

export function AuthButton() {
  const { isLoading, isAuthenticated, error, loginWithRedirect, logout } =
    useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (error) {
    console.error(error);
    return <div>Oops... {error.message}</div>;
  }

  if (isAuthenticated) {
    return (
      <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
        Logout
      </button>
    );
  } else {
    return <button onClick={() => loginWithRedirect()}>Login</button>;
  }
}