import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext.tsx';
import Home from './components/Home.tsx';
import Navigation from './components/Navigation.tsx';
import InactivityLogout from "./components/InactivityLogout.tsx";
import AppLoader from './components/AppLoader.tsx';

const Login = lazy(() => import('./components/Login.tsx'));
const Dashboard = lazy(() => import('./components/Dashboard.tsx'));
const PlayerForm = lazy(() => import('./components/PlayerForm.tsx'));
const AdminRegister = lazy(() => import('./components/AdminRegister.tsx'));
const ReservationSummary = lazy(() => import("./components/ReservationSummary.tsx"));
const Unauthorized = lazy(() => import("./components/Unauthorized.tsx"));
const NotFound = lazy(() => import("./components/NotFound.tsx"));
const MyHistoryReserve = lazy(() => import("./components/MyHistoryReserve.tsx"));
const ImageUploadForm = lazy(() => import("./components/ImageUploadForm.tsx"));
const AdminReserves = lazy(() => import("./components/AdminReserves.tsx"));
const MatchResultUpdate = lazy(() => import("./components/MatchResultUpdate.tsx"));
const MultipleBookingForm = lazy(() => import("./components/MultipleBookingForm.tsx"));
const ResetPassword = lazy(() => import("./components/ResetPassword.tsx"));
const Ranking = lazy(() => import("./components/Ranking.tsx"));
const PlayerProfile = lazy(() => import("./components/PlayerProfile.tsx"));
const PaymentSuccess = lazy(() => import("./pages/payment/PaymentSuccess.tsx"));
const PaymentFailure = lazy(() => import("./pages/payment/PaymentFailure.tsx"));
const PaymentPending = lazy(() => import("./pages/payment/PaymentPending.tsx"));
const AdminCategoriesPlayer = lazy(() => import("./components/AdminCategoriesPlayer.tsx"));

const App: React.FC = () => {
       const routeFallback = <AppLoader text="Cargando vista..." className="app-route-loader" />;

       return (
              <AuthProvider>
                     <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                            <InactivityLogout /> {/* Auto logout component */}
                            <div>
                                   <Navigation />
                                   <div className="app-content-wrapper">
                                          <Suspense fallback={routeFallback}>
                                                 <Routes>
                                                        <Route path="/"
                                                               element={<Home />} />
                                                        <Route path="/login"
                                                               element={<Login />} />
                                                        <Route path="/register"
                                                               element={<PlayerForm />} />
                                                        <Route path="/summary"
                                                               element={<ReservationSummary />} />
                                                        <Route path="/ranking"
                                                               element={<Ranking />} />
                                                        <Route path="/dashboard"
                                                               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                                                        <Route path="/profile"
                                                               element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
                                                        <Route path="/myhistory"
                                                               element={<ProtectedRoute><MyHistoryReserve /></ProtectedRoute>} />
                                                        <Route path="/updatematch"
                                                               element={<ProtectedRoute><MatchResultUpdate /></ProtectedRoute>} />
                                                        <Route path="/adminregister"
                                                               element={<ProtectedRoute adminOnly={true}><AdminRegister /></ProtectedRoute>} />
                                                        <Route path="/items"
                                                               element={<ProtectedRoute adminOnly={true}><ImageUploadForm /></ProtectedRoute>} />
                                                        <Route path="/adminreserves"
                                                               element={<ProtectedRoute adminOnly={true}><AdminReserves /></ProtectedRoute>} />
                                                        <Route path="/multibooking"
                                                               element={<ProtectedRoute adminOnly={true} profesorAllowed={true}><MultipleBookingForm /></ProtectedRoute>} />
                                                        <Route path="/resetpassword"
                                                               element={<ProtectedRoute adminOnly={true}><ResetPassword /></ProtectedRoute>} />
                                                        <Route
                                                            path="/admincategories"
                                                            element={<ProtectedRoute adminOnly={true}><AdminCategoriesPlayer /></ProtectedRoute>}
                                                        />
                                                        <Route path="/payment/success" element={<PaymentSuccess />} />
                                                        <Route path="/payment/failure" element={<PaymentFailure />} />
                                                        <Route path="/payment/pending" element={<PaymentPending />} />
                                                        <Route path="/unauthorized" element={<Unauthorized />} />
                                                        <Route path="*" element={<NotFound />} />
                                                 </Routes>
                                          </Suspense>
                                   </div>
                            </div>
                     </Router>
              </AuthProvider>
       );
};

export default App;
