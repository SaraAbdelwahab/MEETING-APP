import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

/**
 * Connection Test Page
 * Use this to diagnose connection issues
 */
const ConnectionTest = () => {
    const { user, isAuthenticated } = useAuth();
    const { connected, socket } = useSocket();
    const [backendStatus, setBackendStatus] = useState('checking');
    const [apiTest, setApiTest] = useState('checking');

    // Test backend connection
    useEffect(() => {
        const testBackend = async () => {
            try {
                const response = await fetch('http://localhost:5000');
                if (response.ok) {
                    setBackendStatus('online');
                } else {
                    setBackendStatus('error');
                }
            } catch (error) {
                setBackendStatus('offline');
            }
        };

        const testAPI = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/auth/test');
                if (response.ok) {
                    setApiTest('working');
                } else {
                    setApiTest('error');
                }
            } catch (error) {
                setApiTest('offline');
            }
        };

        testBackend();
        testAPI();

        const interval = setInterval(() => {
            testBackend();
            testAPI();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'online':
            case 'working':
                return '#22c55e';
            case 'offline':
                return '#ef4444';
            case 'checking':
                return '#fbbf24';
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'online':
            case 'working':
                return '✅ Online';
            case 'offline':
                return '❌ Offline';
            case 'checking':
                return '⏳ Checking...';
            case 'error':
                return '⚠️ Error';
            default:
                return '❓ Unknown';
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
            color: 'white',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
                    🔍 Connection Test
                </h1>

                {/* Backend Status */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    border: `2px solid ${getStatusColor(backendStatus)}`
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                        Backend Server
                    </h2>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        {getStatusText(backendStatus)}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        http://localhost:5000
                    </div>
                    {backendStatus === 'offline' && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px'
                        }}>
                            <strong>⚠️ Backend is not running!</strong>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                Please start the backend server:
                            </p>
                            <pre style={{
                                background: 'rgba(0, 0, 0, 0.5)',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                marginTop: '0.5rem',
                                overflow: 'auto'
                            }}>
cd backend{'\n'}npm start
                            </pre>
                        </div>
                    )}
                </div>

                {/* Socket Status */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    border: `2px solid ${connected ? '#22c55e' : '#ef4444'}`
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                        WebSocket Connection
                    </h2>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        {connected ? '✅ Connected' : '❌ Disconnected'}
                    </div>
                    {socket && (
                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                            Socket ID: {socket.id || 'None'}
                        </div>
                    )}
                    {!connected && backendStatus === 'online' && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px'
                        }}>
                            <strong>⚠️ Socket not connecting!</strong>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                Backend is running but socket won't connect.
                                <br />
                                Check browser console (F12) for errors.
                            </p>
                        </div>
                    )}
                </div>

                {/* Auth Status */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    border: `2px solid ${isAuthenticated ? '#22c55e' : '#fbbf24'}`
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                        Authentication
                    </h2>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        {isAuthenticated ? '✅ Logged In' : '⚠️ Not Logged In'}
                    </div>
                    {user && (
                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                            User: {user.email}
                        </div>
                    )}
                    {!isAuthenticated && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            background: 'rgba(251, 191, 36, 0.2)',
                            borderRadius: '8px'
                        }}>
                            <strong>ℹ️ You need to login first</strong>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                Socket will only connect after you login.
                            </p>
                            <a 
                                href="/login" 
                                style={{
                                    display: 'inline-block',
                                    marginTop: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    background: '#60c5ff',
                                    color: 'white',
                                    borderRadius: '6px',
                                    textDecoration: 'none'
                                }}
                            >
                                Go to Login
                            </a>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div style={{
                    background: 'rgba(96, 197, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid rgba(96, 197, 255, 0.3)'
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                        📋 Checklist
                    </h2>
                    <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li>
                            <strong>Start Backend:</strong> Open terminal, run:
                            <pre style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                marginTop: '0.25rem'
                            }}>
cd backend && npm start
                            </pre>
                        </li>
                        <li>
                            <strong>Wait for:</strong> "✅ Server running on port 5000"
                        </li>
                        <li>
                            <strong>Login:</strong> Go to <a href="/login" style={{ color: '#60c5ff' }}>/login</a>
                        </li>
                        <li>
                            <strong>Check this page:</strong> All should be green ✅
                        </li>
                        <li>
                            <strong>Join meeting:</strong> Now you can join meetings!
                        </li>
                    </ol>
                </div>

                {/* Quick Actions */}
                <div style={{
                    marginTop: '2rem',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#60c5ff',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Refresh Test
                    </button>
                    <a
                        href="/login"
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#22c55e',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem',
                            textDecoration: 'none',
                            display: 'inline-block'
                        }}
                    >
                        🔐 Login
                    </a>
                    <a
                        href="/dashboard"
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem',
                            textDecoration: 'none',
                            display: 'inline-block'
                        }}
                    >
                        📊 Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ConnectionTest;
