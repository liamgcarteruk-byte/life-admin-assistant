import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the Auth Context
const AuthContext = createContext();

// This is the "provider" - it wraps your app and provides authentication info
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app starts, check if the user was already logged in
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        sessionStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Handle Google login
  const handleGoogleLogin = (credentialResponse) => {
    // credentialResponse.credential is the JWT token from Google
    // We store it so you stay logged in
    const userData = {
      token: credentialResponse.credential,
      // Decode the token to get user info (name, email, picture)
      // JWT structure: header.payload.signature
      // We'll decode the payload (middle part)
      loginTime: new Date().toISOString(),
    };

    // Store in sessionStorage so it persists across page refreshes
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, handleGoogleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use authentication anywhere in your app
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
