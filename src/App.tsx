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
import Unauthorized from "./components/Unauthorized.tsx";
import NotFound from "./components/NotFound.tsx";
import MyHistoryReserve from "./components/MyHistoryReserve.tsx";
import ImageUploadForm from "./components/ImageUploadForm.tsx";
import AdminReserves from "./components/AdminReserves.tsx";
import InactivityLogout from "./components/InactivityLogout.tsx";
import MatchResultUpdate from "./components/MatchResultUpdate.tsx";
import Scoreboard from "./components/Scoreboard.tsx";

const App: React.FC = () => {
    return (
        <UserProvider> {/* Wrap the whole app in UserProvider */}
            <AuthProvider>
                <Router>
                    <InactivityLogout /> {/* Auto logout component */}
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
                                <Route path="/scoreboard"
                                       element={<ProtectedRoute><Scoreboard player1={"Player 1"} player2={"Player 2"}/></ProtectedRoute>}/>
                                <Route path="/myhistory"
                                       element={<ProtectedRoute><MyHistoryReserve/></ProtectedRoute>}/>
                                <Route path="/updatematch"
                                       element={<ProtectedRoute><MatchResultUpdate/></ProtectedRoute>}/>
                                <Route path="/adminregister"
                                       element={<ProtectedRoute adminOnly={true}><AdminRegister /></ProtectedRoute>} />
                                <Route path="/items"
                                       element={<ProtectedRoute adminOnly={true}><ImageUploadForm /></ProtectedRoute>} />
                                <Route path="/adminreserves"
                                       element={<ProtectedRoute adminOnly={true}><AdminReserves /></ProtectedRoute>} />
                                {/* Unauthorized access page */}
                                <Route path="/unauthorized" element={<Unauthorized />} />
                                <Route path="*" element={<NotFound/>}/>
                            </Routes>
                        </div>
                    </div>
                </Router>
            </AuthProvider>
        </UserProvider>
    );
};

export default App;
