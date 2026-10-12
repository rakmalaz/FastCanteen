import React, { createContext, useState, useContext, useMemo } from 'react';
import { Alert } from 'react-native';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null); // { id, nama_tenant, lokasi_stan }

  const addToCart = (menuItem) => {
    // Cek apakah item dari tenant yang berbeda
    if (activeTenant && activeTenant.id !== menuItem.id_tenant && items.length > 0) {
      Alert.alert(
        'Ganti Stan Kantin?',
        `Keranjang Anda berisi menu dari "${activeTenant.nama_tenant}". Ingin mengganti keranjang dengan stan "${menuItem.nama_tenant}"?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ganti Stan',
            onPress: () => {
              setActiveTenant({
                id: menuItem.id_tenant,
                nama_tenant: menuItem.nama_tenant,
                lokasi_stan: menuItem.lokasi_stan,
              });
              setItems([{ ...menuItem, quantity: 1 }]);
            },
          },
        ]
      );
      return;
    }

    if (!activeTenant) {
      setActiveTenant({
        id: menuItem.id_tenant,
        nama_tenant: menuItem.nama_tenant,
        lokasi_stan: menuItem.lokasi_stan,
      });
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === menuItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      } else {
        return [...prevItems, { ...menuItem, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (menuId) => {
    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === menuId);
      if (!existing) return prevItems;

      if (existing.quantity > 1) {
        return prevItems.map((item) =>
          item.id === menuId ? { ...item, quantity: item.quantity - 1 } : item
        );
      } else {
        const remaining = prevItems.filter((item) => item.id !== menuId);
        if (remaining.length === 0) {
          setActiveTenant(null);
        }
        return remaining;
      }
    });
  };

  const deleteItem = (menuId) => {
    setItems((prevItems) => {
      const remaining = prevItems.filter((item) => item.id !== menuId);
      if (remaining.length === 0) {
        setActiveTenant(null);
      }
      return remaining;
    });
  };

  const clearCart = () => {
    setItems([]);
    setActiveTenant(null);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + parseFloat(item.harga) * item.quantity, 0);
  }, [items]);

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        activeTenant,
        addToCart,
        removeFromCart,
        deleteItem,
        clearCart,
        totalAmount,
        totalCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
