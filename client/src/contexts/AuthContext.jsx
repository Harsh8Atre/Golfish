import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { subscriptionService } from '../services/subscriptionService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await authService.getMe();
          setUser(data.user);
          // Also fetch subscription
          try {
            const subData = await subscriptionService.getMe();
            setSubscription(subData.subscription);
          } catch (e) {
            console.error('Failed to fetch subscription', e);
          }
        } catch (error) {
          console.error('Failed to authenticate token:', error);
          localStorage.removeItem('token');
          setUser(null);
          setSubscription(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    let sub = null;
    try {
      const subData = await subscriptionService.getMe();
      sub = subData.subscription;
    } catch (e) {
      console.error('Failed to fetch subscription during login', e);
    }
    // Set both simultaneously to prevent partial state renders
    setSubscription(sub);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, full_name) => {
    const data = await authService.register(email, password, full_name);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setSubscription(null);
  };

  const isSubscribed = subscription && (subscription.status === 'ACTIVE' || subscription.status === 'TRIALING');

  const value = {
    user,
    subscription,
    isSubscribed,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
