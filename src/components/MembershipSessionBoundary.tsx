import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { membershipSessionPath, paymentLoginReturn } from '../utils/memberPayments';

export function MembershipSessionBoundary({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  if (isAuthenticated && user?.financiallyRestricted && !membershipSessionPath(location.pathname)) {
    const returnTo = location.pathname === '/login' ? paymentLoginReturn(location.state?.from) : '/';
    return <Navigate to={returnTo === '/' ? '/monthlypayments' : returnTo} replace />;
  }
  return <>{children}</>;
}
