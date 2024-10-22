import React from 'react';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import {AuthProvider} from './components/AuthContext.tsx';
import {UserProvider} from './components/UserContext.tsx'; // Import the UserProvider
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import Home from './components/Home.tsx';
import PlayerForm from './components/PlayerForm.tsx';
import AdminRegister from './components/AdminRegister.tsx';
import Navigation from './components/Navigation.tsx';
import ReservationSummary from "./components/ReservationSummary.tsx";

const App: React.FC = () => {
    return (
        <UserProvider> {/* Wrap the whole app in UserProvider */}
            <AuthProvider>
                <Router>
                    <div>
                        <Navigation/>
                        <div className="container">
                            <Routes>
                                <Route path="/"
                                       element={<Home/>}/>
                                <Route path="/login"
                                       element={<Login/>}/>
                                <Route path="/register"
                                       element={<PlayerForm/>}/>
                                <Route path="/summary"
                                       element={<ReservationSummary/>}/>
                                <Route path="/dashboard"
                                       element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
                                <Route path="/adminregister"
                                       element={<ProtectedRoute><AdminRegister/></ProtectedRoute>}/>
                                {/* Add other routes here */}
                            </Routes>
                        </div>
                    </div>
                </Router>
            </AuthProvider>
        </UserProvider>
    );
};

export default App;
