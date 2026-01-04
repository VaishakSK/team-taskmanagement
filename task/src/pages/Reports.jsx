import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Reports = () => {
  const { isManager } = useAuth();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isManager) {
      return;
    }
    fetchReports();
  }, [isManager]);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports`);
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isManager) {
    return (
      <div>
        <h1 style={{ color: 'var(--error-color)' }}>Access Denied</h1>
        <p>You don't have permission to view reports.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const taskStats = reports?.taskStatistics || [];
  const teamStats = reports?.teamStatistics || [];
  const userStats = reports?.userProductivity || [];

  return (
    <div>
      <h1 style={{ marginBottom: '32px', color: 'var(--primary-color)', fontSize: '32px', fontWeight: 700 }}>
        Reports
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Task Statistics</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {taskStats.map((stat) => (
                  <tr key={stat.status}>
                    <td>
                      <span className="chip chip-primary">
                        {stat.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>Team Statistics</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th style={{ textAlign: 'right' }}>Members</th>
                  <th style={{ textAlign: 'right' }}>Tasks</th>
                  <th style={{ textAlign: 'right' }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((stat) => (
                  <tr key={stat.id}>
                    <td>{stat.name}</td>
                    <td style={{ textAlign: 'right' }}>{stat.member_count}</td>
                    <td style={{ textAlign: 'right' }}>{stat.task_count}</td>
                    <td style={{ textAlign: 'right' }}>{stat.completed_tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>User Productivity</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th style={{ textAlign: 'right' }}>Total Tasks</th>
                <th style={{ textAlign: 'right' }}>Completed</th>
                <th style={{ textAlign: 'right' }}>In Progress</th>
                <th style={{ textAlign: 'right' }}>Pending</th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((stat) => (
                <tr key={stat.id}>
                  <td>
                    <strong>{stat.name}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{stat.email}</p>
                  </td>
                  <td style={{ textAlign: 'right' }}>{stat.total_tasks}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="chip chip-success">{stat.completed_tasks}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="chip chip-primary">{stat.in_progress_tasks}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="chip chip-warning">{stat.pending_tasks}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
