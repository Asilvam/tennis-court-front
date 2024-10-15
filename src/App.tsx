// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import {AuthProvider} from "./components/AuthContext.tsx";
import Login from "./components/Login.tsx";
import Dashboard from "./components/Dashboard.tsx";
import Home from "./components/Home.tsx";
import PlayerForm from "./components/PlayerForm.tsx";
import AdminRegister from "./components/AdminRegister.tsx";

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<PlayerForm />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/adminregister" element={<ProtectedRoute><AdminRegister /></ProtectedRoute>} />
                    {/* Add other routes here */}
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
