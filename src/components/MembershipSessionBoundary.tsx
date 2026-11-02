import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { paymentLoginReturn } from '../utils/memberPayments';

export function MembershipSessionBoundary({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (isAuthenticated && location.pathname === '/login') {
    return <Navigate to={paymentLoginReturn(location.state?.from)} replace />;
  }
  return <>{children}</>;
}
