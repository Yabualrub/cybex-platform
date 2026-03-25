import { auth } from './auth';

export function requireAuth(router: { push: (path: string) => void }) {
  const token = auth.getToken();
  if (!token) {
    router.push('/login');
    return null;
  }
  return token;
}
