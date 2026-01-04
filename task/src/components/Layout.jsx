import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../Layout.css';
import '../App.css';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isManager } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const menuItems = [
    { text: 'Dashboard', path: '/dashboard', icon: '📊' },
    { text: 'Tasks', path: '/tasks', icon: '✓' },
    ...(isManager ? [{ text: 'Teams', path: '/teams', icon: '👥' }] : []),
    ...(isManager ? [{ text: 'Reports', path: '/reports', icon: '📈' }] : []),
    ...(isAdmin ? [{ text: 'Users', path: '/users', icon: '👤' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="header-title">Task Manager</h1>
            {user && user.role && (
              <span className={`chip ${user.role === 'admin' ? 'chip-error' : user.role === 'manager' ? 'chip-warning' : 'chip-primary'}`} 
                    style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 600 }}>
                {user.role.toUpperCase()}
              </span>
            )}
          </div>
          <div className="header-user">
            <span className="user-name">{user?.name}</span>
            <div className="user-avatar-container">
              <button 
                className="user-avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="user-menu">
                  <div className="user-menu-item user-info">
                    <strong>{user?.email}</strong>
                    <span className="user-role">{user?.role}</span>
                  </div>
                  <div className="user-menu-divider"></div>
                  <button className="user-menu-item" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="layout-body">
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.text}</span>
              </button>
            ))}
            <div className="sidebar-divider"></div>
            <button
              className="nav-item nav-item-logout"
              onClick={handleLogout}
            >
              <span className="nav-icon">🚪</span>
              <span className="nav-text">Logout</span>
            </button>
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;
