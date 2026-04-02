import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <Link to="/">Meeting App</Link>
            </div>

            {isAuthenticated ? (
                <>
                    <div className="nav-links">
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/create-meeting">Create Meeting</Link>
                    </div>
                    
                    <div className="nav-user">
                        <span className="user-email">{user?.email}</span>
                        <button onClick={handleLogout} className="btn-logout">
                            Logout
                        </button>
                    </div>
                </>
            ) : (
                <div className="nav-links">
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                </div>
            )}
        </nav>
    );
};

export default Navbar;