import React, { createContext, useState, useContext } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, kata_sandi) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email, kata_sandi });
      if (response.data.success) {
        setUser(response.data.data);
        return { success: true, user: response.data.data };
      }
      return { success: false, message: response.data.message || 'Login gagal' };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Gagal terhubung ke server backend';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/register', payload);
      if (response.data.success) {
        setUser(response.data.data);
        return { success: true, user: response.data.data };
      }
      return { success: false, message: response.data.message || 'Registrasi gagal' };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Gagal terhubung ke server backend';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const isMahasiswa = user?.peran === 'mahasiswa';
  const isTenant = user?.peran === 'tenant';
  const isAdmin = user?.peran === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        logout,
        isMahasiswa,
        isTenant,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
