// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import {AuthProvider} from "./components/AuthContext.tsx";
import Login from "./components/Login.tsx";
import Dashboard from "./components/Dashboard.tsx";
import Home from "./components/Home.tsx";

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                    />
                    {/* Add other routes here */}
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
