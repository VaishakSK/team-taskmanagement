import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';
import './Reports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Reports = () => {
  const { isManager, isAdmin } = useAuth();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!isManager && !isAdmin) {
      return;
    }
    fetchTeams();
    fetchReports();
  }, [isManager, isAdmin, selectedTeam, dateRange]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/teams`);
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedTeam) params.team_id = selectedTeam;
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;

      const response = await axios.get(`${API_URL}/api/reports`, { params });
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isManager && !isAdmin) {
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

  if (!reports) {
    return (
      <div>
        <h1>Reports</h1>
        <p>No data available</p>
      </div>
    );
  }

  // Task Status Pie Chart
  const taskStatusData = {
    labels: reports.taskStatusDistribution?.labels || [],
    datasets: [
      {
        label: 'Tasks',
        data: reports.taskStatusDistribution?.data || [],
        backgroundColor: reports.taskStatusDistribution?.colors || [],
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  // Tasks Over Time Line Chart
  const tasksOverTimeData = {
    labels: reports.tasksOverTime?.labels || [],
    datasets: [
      {
        label: 'Tasks Created',
        data: reports.tasksOverTime?.created || [],
        borderColor: 'rgb(25, 118, 210)',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Tasks Completed',
        data: reports.tasksOverTime?.completed || [],
        borderColor: 'rgb(46, 125, 50)',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Team Performance Bar Chart
  const teamPerformanceData = {
    labels: reports.teamPerformance?.labels || [],
    datasets: [
      {
        label: 'Total Tasks',
        data: reports.teamPerformance?.tasks || [],
        backgroundColor: 'rgba(25, 118, 210, 0.8)',
      },
      {
        label: 'Completed',
        data: reports.teamPerformance?.completed || [],
        backgroundColor: 'rgba(46, 125, 50, 0.8)',
      },
      {
        label: 'In Progress',
        data: reports.teamPerformance?.inProgress || [],
        backgroundColor: 'rgba(237, 108, 2, 0.8)',
      },
      {
        label: 'Pending',
        data: reports.teamPerformance?.pending || [],
        backgroundColor: 'rgba(211, 47, 47, 0.8)',
      },
    ],
  };

  // User Productivity Bar Chart
  const userProductivityData = {
    labels: reports.userProductivity?.labels || [],
    datasets: [
      {
        label: 'Total Tasks',
        data: reports.userProductivity?.total || [],
        backgroundColor: 'rgba(25, 118, 210, 0.8)',
      },
      {
        label: 'Completed',
        data: reports.userProductivity?.completed || [],
        backgroundColor: 'rgba(46, 125, 50, 0.8)',
      },
      {
        label: 'In Progress',
        data: reports.userProductivity?.inProgress || [],
        backgroundColor: 'rgba(237, 108, 2, 0.8)',
      },
      {
        label: 'Pending',
        data: reports.userProductivity?.pending || [],
        backgroundColor: 'rgba(211, 47, 47, 0.8)',
      },
    ],
  };

  // Activity Timeline Line Chart
  const activityTimelineData = {
    labels: reports.activityTimeline?.labels || [],
    datasets: reports.activityTimeline?.datasets?.map(ds => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: ds.color + '20',
      tension: 0.4,
      fill: false,
    })) || [],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    }
  };

  const pieChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        position: 'right'
      }
    }
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1 className="reports-title">Analytics & Reports</h1>
        <p className="reports-subtitle">Visual insights into your team's performance and activity</p>
      </div>

      <div className="reports-filters">
        <div className="filter-group">
          <label className="filter-label">Filter by Team</label>
          <select
            className="filter-select"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Start Date</label>
          <input
            type="date"
            className="filter-input"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">End Date</label>
          <input
            type="date"
            className="filter-input"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>
      </div>

      <div className="reports-grid">
        {/* Task Status Distribution - Pie Chart */}
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Task Status Distribution</h3>
            <p className="report-card-subtitle">Overview of task statuses</p>
          </div>
          <div className="chart-container">
            {reports.taskStatusDistribution?.data?.length > 0 ? (
              <Pie data={taskStatusData} options={pieChartOptions} />
            ) : (
              <div className="chart-empty">No data available</div>
            )}
          </div>
        </div>

        {/* Tasks Over Time - Line Chart */}
        <div className="report-card">
          <div className="report-card-header">
            <h3 className="report-card-title">Tasks Over Time</h3>
            <p className="report-card-subtitle">Task creation and completion trends (Last 30 days)</p>
          </div>
          <div className="chart-container">
            {reports.tasksOverTime?.labels?.length > 0 ? (
              <Line data={tasksOverTimeData} options={chartOptions} />
            ) : (
              <div className="chart-empty">No data available</div>
            )}
          </div>
        </div>

        {/* Team Performance - Bar Chart */}
        <div className="report-card report-card-wide">
          <div className="report-card-header">
            <h3 className="report-card-title">Team Performance</h3>
            <p className="report-card-subtitle">Task distribution across teams</p>
          </div>
          <div className="chart-container">
            {reports.teamPerformance?.labels?.length > 0 ? (
              <Bar data={teamPerformanceData} options={chartOptions} />
            ) : (
              <div className="chart-empty">No data available</div>
            )}
          </div>
        </div>

        {/* User Productivity - Bar Chart */}
        <div className="report-card report-card-wide">
          <div className="report-card-header">
            <h3 className="report-card-title">Top User Productivity</h3>
            <p className="report-card-subtitle">Task completion by employee (Top 10)</p>
          </div>
          <div className="chart-container">
            {reports.userProductivity?.labels?.length > 0 ? (
              <Bar data={userProductivityData} options={chartOptions} />
            ) : (
              <div className="chart-empty">No data available</div>
            )}
          </div>
        </div>

        {/* Activity Timeline - Line Chart */}
        <div className="report-card report-card-wide">
          <div className="report-card-header">
            <h3 className="report-card-title">Activity Timeline</h3>
            <p className="report-card-subtitle">System activities over time (Last 30 days)</p>
          </div>
          <div className="chart-container">
            {reports.activityTimeline?.labels?.length > 0 ? (
              <Line data={activityTimelineData} options={chartOptions} />
            ) : (
              <div className="chart-empty">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
