import React from 'react';
import {Route, Routes} from 'react-router-dom';
import Login from './components/Login';
import NotFound from './components/NotFound';
import Home from "./components/Home.tsx";
import Dashboard from "./components/Dashboard.tsx";
import PlayerForm from "./components/PlayerForm.tsx";
import AdminRegister from "./components/AdminRegister.tsx";
import ReservationSummary from "./components/ReservationSummary.tsx";
import MyHistoryReserve from "./components/MyHistoryReserve.tsx";

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/login" element={<Login/>}/>
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/register" element={<PlayerForm/>}/>
            <Route path="/adminregister" element={<AdminRegister/>}/>
            <Route path="/summary" element={<ReservationSummary/>}/>
            <Route path="/myhistory" element={<MyHistoryReserve/>}/>
            <Route path="*" element={<NotFound/>}/>
        </Routes>
    );
};

export default Router;
