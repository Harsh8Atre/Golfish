import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { authService } from '../services/authService';
import { subscriptionService } from '../services/subscriptionService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the latest subscription from the backend
  const refreshSubscription = useCallback(async () => {
    try {
      const subData = await subscriptionService.getMe();

      console.log('🔥 SUBSCRIPTION API RESPONSE:', subData);

      const currentSubscription = subData?.subscription ?? null;

      console.log('🔥 CURRENT SUBSCRIPTION:', currentSubscription);

      setSubscription(currentSubscription);

      return currentSubscription;
    } catch (error) {
      console.error(
        'Failed to refresh subscription:',
        error.response?.data || error.message
      );

      setSubscription(null);
      return null;
    }
  }, []);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setUser(null);
          setSubscription(null);
          return;
        }

        const data = await authService.getMe();
        setUser(data.user);

        await refreshSubscription();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);

        localStorage.removeItem('token');
        setUser(null);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [refreshSubscription]);

  // Login
  const login = async (email, password) => {
    const data = await authService.login(email, password);

    setUser(data.user);
    await refreshSubscription();

    return data;
  };

  // Register
  const register = async (email, password, full_name) => {
    return await authService.register(email, password, full_name);
  };

  // Logout
  const logout = () => {
    authService.logout();
    setUser(null);
    setSubscription(null);
  };

  const isSubscribed =
    !!subscription &&
    ['ACTIVE', 'TRIALING'].includes(subscription.status);

  const value = {
    user,
    subscription,
    isSubscribed,
    loading,
    login,
    register,
    logout,
    refreshSubscription,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);