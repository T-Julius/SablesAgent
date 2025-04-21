import React, { createContext, useState, useEffect, useContext } from 'react';

// Create auth context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    // This would typically check for a token in localStorage and validate it
    // For now, we'll just set loading to false
    setLoading(false);
  }, []);

  // Mock login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // This would typically make an API call to authenticate
      // For now, we'll just mock success
      const mockUser = {
        id: '123',
        name: 'Test User',
        email: email,
        role: 'admin'
      };
      
      setCurrentUser(mockUser);
      return mockUser;
    } catch (err) {
      setError('Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mock logout function
  const logout = async () => {
    // This would typically make an API call to logout
    setCurrentUser(null);
  };

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
