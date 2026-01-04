import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Tasks = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tasks`);
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    try {
      await axios.delete(`${API_URL}/api/tasks/${selectedTask.id}`);
      fetchTasks();
      setMenuOpen(null);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'chip-success';
      case 'in_progress': return 'chip-primary';
      case 'cancelled': return 'chip-error';
      default: return 'chip-warning';
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-3">
        <h1 style={{ color: 'var(--primary-color)', fontSize: '32px', fontWeight: 700 }}>Tasks</h1>
        {isManager && (
          <button className="btn btn-primary" onClick={() => navigate('/tasks/new')}>
            ➕ Create Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="card">
          <p className="text-center" style={{ padding: '32px', color: 'var(--text-secondary)' }}>
            No tasks found. {isManager && 'Create your first task!'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Team</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    {task.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {task.description.substring(0, 50)}...
                      </p>
                    )}
                  </td>
                  <td>
                    <span className={`chip ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>{task.assigned_to_name || 'Unassigned'}</td>
                  <td>{task.team_name || '-'}</td>
                  <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      {!isManager && task.assigned_to && (
                        <select
                          className="form-select"
                          style={{ minWidth: '120px', padding: '6px' }}
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                      {isManager && (
                        <>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '14px' }}
                            onClick={() => navigate(`/tasks/${task.id}/edit`)}
                          >
                            ✏️
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '6px 12px', fontSize: '14px' }}
                              onClick={() => {
                                setMenuOpen(menuOpen === task.id ? null : task.id);
                                setSelectedTask(task);
                              }}
                            >
                              ⋮
                            </button>
                            {menuOpen === task.id && (
                              <div className="dropdown-menu">
                                <button
                                  className="dropdown-item"
                                  onClick={handleDelete}
                                  style={{ color: 'var(--error-color)' }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Tasks;
