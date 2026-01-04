import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState({
    tasks: { total: 0, pending: 0, inProgress: 0, completed: 0 },
    teams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [tasksRes, teamsRes] = await Promise.all([
        axios.get(`${API_URL}/api/tasks`),
        isManager ? axios.get(`${API_URL}/api/teams`) : Promise.resolve({ data: { teams: [] } }),
      ]);

      const tasks = tasksRes.data.tasks || [];
      const teams = teamsRes.data.teams || [];

      setStats({
        tasks: {
          total: tasks.length,
          pending: tasks.filter((t) => t.status === 'pending').length,
          inProgress: tasks.filter((t) => t.status === 'in_progress').length,
          completed: tasks.filter((t) => t.status === 'completed').length,
        },
        teams: teams.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Tasks', value: stats.tasks.total, icon: '✓', color: 'var(--primary-color)' },
    { title: 'Pending Tasks', value: stats.tasks.pending, icon: '⏳', color: 'var(--warning-color)' },
    { title: 'In Progress', value: stats.tasks.inProgress, icon: '🔄', color: 'var(--primary-light)' },
    { title: 'Completed', value: stats.tasks.completed, icon: '✅', color: 'var(--success-color)' },
    ...(isManager ? [{ title: 'Teams', value: stats.teams, icon: '👥', color: '#9c27b0' }] : []),
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '32px', color: 'var(--primary-color)', fontSize: '32px', fontWeight: 700 }}>
        Welcome back, {user?.name}!
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {statCards.map((card, index) => (
          <div
            key={index}
            className="card"
            style={{
              background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
              border: `2px solid ${card.color}30`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{card.title}</p>
                <h2 style={{ fontSize: '36px', fontWeight: 700, color: card.color, margin: 0 }}>
                  {card.value}
                </h2>
              </div>
              <div style={{ fontSize: '48px' }}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>
            Your Role: <span className={`chip ${user?.role === 'admin' ? 'chip-error' : user?.role === 'manager' ? 'chip-warning' : 'chip-primary'}`}>{user?.role?.toUpperCase()}</span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {isAdmin
              ? 'As an Admin, you have full access to manage users, teams, and tasks. You can create and delete users, manage all teams, and oversee all tasks in the system.'
              : isManager
              ? 'As a Manager, you can create and manage teams and tasks, assign work to team members, and view detailed reports on team performance.'
              : 'As an Employee, you can view and update the status of tasks assigned to you. Keep your tasks updated to help your team track progress.'}
          </p>
        </div>

        <div className="card" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isManager && (
              <button 
                className="btn btn-primary" 
                onClick={() => window.location.href = '/tasks/new'}
                style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
              >
                ➕ Create New Task
              </button>
            )}
            {isManager && (
              <button 
                className="btn btn-outline" 
                onClick={() => window.location.href = '/teams/new'}
                style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
              >
                👥 Create New Team
              </button>
            )}
            <button 
              className="btn btn-outline" 
              onClick={() => window.location.href = '/tasks'}
              style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              📋 View All Tasks
            </button>
            {isManager && (
              <button 
                className="btn btn-outline" 
                onClick={() => window.location.href = '/reports'}
                style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
              >
                📈 View Reports
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="dashboard-footer">
        <div className="dashboard-footer-content">
          <p>&copy; {new Date().getFullYear()} Task Manager. All rights reserved.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Version 1.0.0 | Built with React & Node.js
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
