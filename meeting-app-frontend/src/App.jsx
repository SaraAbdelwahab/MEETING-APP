import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WebRTCProvider } from './context/WebRTCContext';
import { SecureSignalingProvider } from './context/SecureSignalingContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/common/PrivateRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PremiumDashboard from './components/dashboard/PremiumDashboard';
import CreateMeeting from './components/meetings/CreateMeeting';
import MeetingDetails from './components/meetings/MeetingDetails';
import MeetingRoomProduction from './components/meetings/MeetingRoomProduction';
import MeetingRoomUltimate from './components/meetings/MeetingRoomUltimate';
import MeetingRoomPremium from './components/meetings/MeetingRoomPremium';
import LandingPage from './components/landing/LandingPage';
import ConnectionTest from './components/test/ConnectionTest';
import RealDataTest from './components/test/RealDataTest';
import MeetingsPage from './components/pages/MeetingsPage';
import CalendarPage from './components/pages/CalendarPage';
import RecordingsPage from './components/pages/RecordingsPage';
import SecurityPage from './components/pages/SecurityPage';
import SettingsPage from './components/pages/SettingsPage';
import './App.css';

const LocationAwareLogin = () => {
    const location = useLocation();
    return <Login initialMessage={location.state?.message} />;
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <SocketProvider>
                    <SecureSignalingProvider>
                        <WebRTCProvider>
                            <Router>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/test" element={<ConnectionTest />} />
                                    <Route path="/real-test" element={<RealDataTest />} />
                                    <Route path="/login"    element={<LocationAwareLogin />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/dashboard" element={<PrivateRoute><AppLayout><PremiumDashboard /></AppLayout></PrivateRoute>} />
                                    <Route path="/create-meeting" element={<PrivateRoute><CreateMeeting /></PrivateRoute>} />
                                    <Route path="/meetings/:id" element={<PrivateRoute><MeetingRoomPremium /></PrivateRoute>} />
                                    <Route path="/meeting/:id" element={<PrivateRoute><MeetingRoomPremium /></PrivateRoute>} />
                                    <Route path="/meetings"   element={<PrivateRoute><AppLayout><MeetingsPage /></AppLayout></PrivateRoute>} />
                                    <Route path="/calendar"   element={<PrivateRoute><AppLayout><CalendarPage /></AppLayout></PrivateRoute>} />
                                    <Route path="/recordings" element={<PrivateRoute><AppLayout><RecordingsPage /></AppLayout></PrivateRoute>} />
                                    <Route path="/security"   element={<PrivateRoute><AppLayout><SecurityPage /></AppLayout></PrivateRoute>} />
                                    <Route path="/settings"   element={<PrivateRoute><AppLayout><SettingsPage /></AppLayout></PrivateRoute>} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Router>
                        </WebRTCProvider>
                    </SecureSignalingProvider>
                </SocketProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
