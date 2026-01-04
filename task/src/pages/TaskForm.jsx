import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';
import './FormStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isManager } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_user_ids: [],
    team_id: '',
    due_date: '',
  });

  useEffect(() => {
    if (!isManager) {
      navigate('/tasks');
      return;
    }
    fetchOptions();
    if (id) {
      fetchTask();
    }
  }, [id, isManager, navigate]);

  useEffect(() => {
    // Update available team members when team changes
    if (formData.team_id) {
      fetchTeamMembers(formData.team_id);
    } else {
      setTeamMembers([]);
      setFormData(prev => ({ ...prev, assigned_user_ids: [] }));
    }
  }, [formData.team_id]);

  const fetchOptions = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/teams`),
      ]);
      setUsers(usersRes.data.users || []);
      setTeams(teamsRes.data.teams || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchTeamMembers = async (teamId) => {
    try {
      const response = await axios.get(`${API_URL}/api/teams/${teamId}`);
      setTeamMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchTask = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tasks/${id}`);
      const task = response.data.task;
      const assigneeIds = task.assignees ? task.assignees.map(a => a.id) : 
                          (task.assigned_to ? [task.assigned_to] : []);
      
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigned_user_ids: assigneeIds,
        team_id: task.team_id || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
      });

      if (task.team_id) {
        fetchTeamMembers(task.team_id);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      setError('Failed to load task');
    }
  };

  const handleTeamChange = (teamId) => {
    setFormData(prev => ({ 
      ...prev, 
      team_id: teamId,
      assigned_user_ids: [] // Clear assignees when team changes
    }));
  };

  const toggleAssignee = (userId) => {
    setFormData(prev => ({
      ...prev,
      assigned_user_ids: prev.assigned_user_ids.includes(userId)
        ? prev.assigned_user_ids.filter(id => id !== userId)
        : [...prev.assigned_user_ids, userId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate: if team is selected, all assignees must be from that team
    if (formData.team_id && formData.assigned_user_ids.length > 0) {
      const teamMemberIds = teamMembers.map(m => m.id);
      const invalidAssignees = formData.assigned_user_ids.filter(id => !teamMemberIds.includes(id));
      if (invalidAssignees.length > 0) {
        setError('All assigned users must be members of the selected team');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        assigned_user_ids: formData.assigned_user_ids.length > 0 ? formData.assigned_user_ids : undefined,
        team_id: formData.team_id || null,
        due_date: formData.due_date || null,
      };

      if (id) {
        await axios.put(`${API_URL}/api/tasks/${id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/tasks`, payload);
      }
      navigate('/tasks');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = formData.team_id && teamMembers.length > 0 
    ? teamMembers 
    : users;

  return (
    <div className="form-page-container">
      <div className="form-header">
        <h1 className="form-title">{id ? 'Edit Task' : 'Create New Task'}</h1>
        <p className="form-subtitle">Fill in the details to {id ? 'update' : 'create'} a task</p>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Enter task title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Enter task description"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Team</label>
            <select
              className="form-select"
              value={formData.team_id}
              onChange={(e) => handleTeamChange(e.target.value)}
            >
              <option value="">No Team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <small className="form-hint">
              {formData.team_id 
                ? 'Select team members from the selected team below'
                : 'Select a team to assign team members to this task'}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">
              Assign To {formData.team_id && <span className="form-required">(Team Members Only)</span>}
            </label>
            {formData.team_id && teamMembers.length === 0 ? (
              <div className="form-empty-state">
                <p>No members in this team. Please add members to the team first.</p>
              </div>
            ) : (
              <div className="form-checkbox-group">
                {availableUsers.map((user) => (
                  <label key={user.id} className="form-checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.assigned_user_ids.includes(user.id)}
                      onChange={() => toggleAssignee(user.id)}
                      disabled={formData.team_id && !teamMembers.find(m => m.id === user.id)}
                    />
                    <span className="form-checkbox-label">
                      {user.name} <span className="form-checkbox-email">({user.email})</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {formData.assigned_user_ids.length > 0 && (
              <small className="form-hint form-hint-success">
                {formData.assigned_user_ids.length} user{formData.assigned_user_ids.length > 1 ? 's' : ''} selected
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  <span>Saving...</span>
                </>
              ) : (
                id ? 'Update Task' : 'Create Task'
              )}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/tasks')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
