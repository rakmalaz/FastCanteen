import React, { createContext, useState, useContext, useEffect } from 'react';
import API, { setAuthToken } from '../api/axios';
import { TOKEN_KEY, PUSH_KEY, simpanAman, bacaAman, hapusAman } from '../utils/secureStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  // true selama aplikasi memeriksa token tersimpan saat dibuka
  const [restoring, setRestoring] = useState(true);

  // Pulihkan sesi: token dari SecureStore diverifikasi backend lewat GET /auth/me
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const tersimpan = await bacaAman(TOKEN_KEY);
        if (!tersimpan) return;

        const res = await API.get('/auth/me', {
          headers: { Authorization: `Bearer ${tersimpan}` },
          timeout: 6000,
        });
        if (aktif && res.data.success) {
          setAuthToken(tersimpan);
          setUser(res.data.data);
        }
      } catch (err) {
        // Hapus token hanya bila memang ditolak backend (kedaluwarsa/tidak valid/akun hilang).
        // Bila server sekadar tidak terjangkau, token dibiarkan agar bisa dicoba lagi nanti.
        const status = err.response?.status;
        if (status === 401 || status === 404) {
          await hapusAman(TOKEN_KEY);
        }
      } finally {
        if (aktif) setRestoring(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const mulaiSesi = async (token, data) => {
    setAuthToken(token);
    await simpanAman(TOKEN_KEY, token);
    setUser(data);
  };

  const login = async (email, kata_sandi) => {
    setLoading(true);
    try {
      const response = await API.post('/auth/login', { email, kata_sandi });
      if (response.data.success) {
        await mulaiSesi(response.data.token, response.data.data);
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
        await mulaiSesi(response.data.token, response.data.data);
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

  // Sesi dibersihkan langsung (UI tidak menunggu jaringan); push token dihapus di latar belakang
  const logout = () => {
    const authLama = API.defaults.headers.common.Authorization;
    setAuthToken(null);
    setUser(null);
    hapusAman(TOKEN_KEY);

    (async () => {
      const pushToken = await bacaAman(PUSH_KEY);
      if (pushToken && authLama) {
        try {
          await API.delete('/notifikasi/token', {
            data: { expoPushToken: pushToken },
            headers: { Authorization: authLama },
            timeout: 5000,
          });
        } catch (e) {
          /* gagal hapus di server: tidak menghalangi logout */
        }
      }
      await hapusAman(PUSH_KEY);
    })();
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
        restoring,
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
