export const GUEST_CART_KEY = 'carrito_invitado';
export const POST_LOGIN_REDIRECT_KEY = 'post_login_redirect';

export function getCartStorageKey(userId) {
  return userId ? `carrito_${userId}` : GUEST_CART_KEY;
}

export function readCart(userId) {
  try {
    const raw = localStorage.getItem(getCartStorageKey(userId));
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      cantidad: Number(item.cantidad || 1)
    }));
  } catch {
    return [];
  }
}

export function writeCart(userId, cart) {
  localStorage.setItem(getCartStorageKey(userId), JSON.stringify(cart));
}

export function clearCart(userId) {
  localStorage.removeItem(getCartStorageKey(userId));
}

export function mergeGuestCartIntoUserCart(userId) {
  if (!userId) return [];

  const guestCart = readCart(null);
  const userCart = readCart(userId);

  if (guestCart.length === 0) {
    return userCart;
  }

  const mergedCart = [...userCart];

  guestCart.forEach((guestItem) => {
    const existing = mergedCart.find((item) => item.id === guestItem.id);

    if (existing) {
      const maxStock = existing.stock ?? guestItem.stock ?? Infinity;
      existing.cantidad = Math.min(existing.cantidad + guestItem.cantidad, maxStock);
      return;
    }

    mergedCart.push(guestItem);
  });

  writeCart(userId, mergedCart);
  clearCart(null);

  return mergedCart;
}
