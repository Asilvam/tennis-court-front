import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import NotFound from './components/NotFound';
import Home from "./components/Home.tsx";
import Dashboard from "./components/Dashboard.tsx";

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default Router;
