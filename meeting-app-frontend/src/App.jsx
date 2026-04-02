import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { WebRTCProvider } from './context/WebRTCContext';
import PrivateRoute from './components/common/PrivateRoute';
import Navbar from './components/common/Navbar'; // We'll create this next
import Login from './components/auth/Login'; // We'll create this next
import Register from './components/auth/Register'; // We'll create this next
import Dashboard from './components/meetings/Dashboard'; // We'll create this next
import CreateMeeting from './components/meetings/CreateMeeting';
import MeetingDetails from './components/meetings/MeetingDetails';
import MeetingRoom from './components/meetings/MeetingRoom';
import './App.css';

// Wrapper component to show messages from navigation state
const LocationAwareLogin = () => {
    const location = useLocation();
    const message = location.state?.message;
    
    return <Login initialMessage={message} />;
};

function App() {
    return (
        <AuthProvider>
             <SocketProvider>
                <WebRTCProvider>
            <Router>
                <div className="App">
                    <Navbar />
                    <main className="container">
                        <Routes>
                            {/* Public routes */}
                            <Route path="/login" element={<LocationAwareLogin />} />
                            <Route path="/register" element={<Register />} />
                            
                            {/* Protected routes */}
                            <Route 
                                path="/dashboard" 
                                element={
                                    <PrivateRoute>
                                        <Dashboard />
                                    </PrivateRoute>
                                } 
                            />
                            

                             <Route 
                                path="/create-meeting" 
                                element={
                                    <PrivateRoute>
                                        <CreateMeeting />
                                    </PrivateRoute>
                                } 
                            />

                             <Route 
                                path="/meetings/:id" 
                                element={
                                    <PrivateRoute>
                                        <MeetingDetails />
                                    </PrivateRoute>
                                } 
                            />

                            <Route
                                        path="/meeting/:id"
                                        element={
                                            <PrivateRoute>
                                                <MeetingRoom />
                                            </PrivateRoute>
                                        }
                                    />

                             {/* Redirect root to dashboard or login based on auth */}
                            <Route 
                                path="/" 
                                element={<Navigate to="/dashboard" replace />} 
                            />
                            
                            {/* 404 route */}
                            <Route 
                                path="*" 
                                element={<div>404 - Page Not Found</div>} 
                            />
                        </Routes>
                    </main>
                </div>
            </Router>
            </WebRTCProvider>
            </SocketProvider>
        </AuthProvider>
    );
}



export default App;