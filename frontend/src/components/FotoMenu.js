import React, { useState, useEffect } from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveBuktiUrl } from '../api/axios';
import { COLORS } from '../constants/theme';

// Menampilkan foto menu. Jika foto kosong ATAU gagal dimuat (alamat mati),
// tampilkan ikon cadangan, bukan kotak abu-abu kosong.
export default function FotoMenu({ foto, style }) {
  const [gagal, setGagal] = useState(false);

  // reset status gagal bila foto diganti (misalnya setelah tenant mengunggah foto baru)
  useEffect(() => {
    setGagal(false);
  }, [foto]);

  // '/uploads/menu-9-123.jpg' -> 'http://IP-server:5000/uploads/menu-9-123.jpg'
  // alamat http(s):// (data lama) dibiarkan apa adanya
  const uri = resolveBuktiUrl(foto);

  if (!uri || gagal) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.inputBackground }]}>
        <Ionicons name="restaurant-outline" size={26} color={COLORS.textSecondary} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setGagal(true)} />;
}