import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './Sidebar.css';

const AppLayout = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-layout-container">
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div 
                    className="mobile-overlay" 
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(v => !v)}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />

            {/* Main content with proper margin */}
            <main className="app-layout-main">
                <TopBar onMenuClick={() => setMobileOpen(true)} />
                <div className="app-layout-content">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
