export const auth = {
  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('cybex_token');
  },
  setToken(token: string) {
    localStorage.setItem('cybex_token', token);
  },
  clear() {
    localStorage.removeItem('cybex_token');
  },
};
