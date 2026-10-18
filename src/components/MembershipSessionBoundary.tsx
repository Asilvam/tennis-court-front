import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './useAuth';

export function MembershipSessionBoundary({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (isAuthenticated && user?.financiallyRestricted && location.pathname !== '/monthlypayments')
    return <Navigate to="/monthlypayments" replace />;
  return <>{children}</>;
}
