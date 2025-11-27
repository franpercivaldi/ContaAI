import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = getAccessToken();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
}
