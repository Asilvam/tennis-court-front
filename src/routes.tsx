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
import ImageUploadForm from "./components/ImageUploadForm.tsx";
import AdminReserves from "./components/AdminReserves.tsx";
import MatchResultUpdate from "./components/MatchResultUpdate.tsx";
import Scoreboard from "./components/Scoreboard.tsx";
import MultipleBookingForm from "./components/MultipleBookingForm.tsx";

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/login" element={<Login/>}/>
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/scoreboard" element={<Scoreboard player1={"Player 1"} player2={"Player 2"}/>}/>
            <Route path="/register" element={<PlayerForm/>}/>
            <Route path="/adminregister" element={<AdminRegister/>}/>
            <Route path="/items" element={<ImageUploadForm/>}/>
            <Route path="/adminreserves" element={<AdminReserves/>}/>
            <Route path="/summary" element={<ReservationSummary/>}/>
            <Route path="/myhistory" element={<MyHistoryReserve/>}/>
            <Route path="/updatematch" element={<MatchResultUpdate/>}/>
            <Route path="/multibooking" element={<MultipleBookingForm/>}/>
            <Route path="*" element={<NotFound/>}/>
        </Routes>
    );
};

export default Router;
