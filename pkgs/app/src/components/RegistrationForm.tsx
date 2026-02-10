import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function RegistrationForm() {
  const { registerUser, isAppUserLoading, appUserError } = useAuth();
  const [role, setRole] = useState<'farmer' | 'restaurant'>('farmer');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await registerUser(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (appUserError && !appUserError.message.includes('not found')) {
    return (
      <div className="registration-form">
        <p className="error">Error: {appUserError.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="registration-form">
      <h3>Complete Registration</h3>
      <p>Please select your role to complete your account setup:</p>
      
      <div>
        <label>
          <input
            type="radio"
            value="farmer"
            checked={role === 'farmer'}
            onChange={(e) => setRole(e.target.value as 'farmer' | 'restaurant')}
          />
          Farmer
        </label>
      </div>
      
      <div>
        <label>
          <input
            type="radio"
            value="restaurant"
            checked={role === 'restaurant'}
            onChange={(e) => setRole(e.target.value as 'farmer' | 'restaurant')}
          />
          Restaurant
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={isSubmitting || isAppUserLoading}>
        {isSubmitting ? 'Registering...' : 'Complete Registration'}
      </button>
    </form>
  );
}
