import { useAuth } from '../providers/authContext';

export function UserProfile() {
  const { appUser, user, isLoading, isAppUserLoading } = useAuth();

  if (isLoading || isAppUserLoading) {
    return <div>Loading user profile...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      <div>
        <strong>Auth0 User:</strong>
        <p>Name: {user.name || user.nickname || 'N/A'}</p>
        <p>Email: {user.email || 'N/A'}</p>
      </div>
      
      {appUser ? (
        <div>
          <strong>App User:</strong>
          <p>Role: {appUser.role}</p>
          <p>Registered: {new Date(appUser.createdAt).toLocaleDateString()}</p>
        </div>
      ) : (
        <div>
          <p>⚠️ User not registered. Please complete registration.</p>
        </div>
      )}
    </div>
  );
}
