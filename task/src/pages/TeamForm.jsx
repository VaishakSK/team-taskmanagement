import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';
import './FormStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TeamForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    member_ids: [],
  });

  useEffect(() => {
    if (!isManager && !isAdmin) {
      navigate('/teams');
      return;
    }
    if (isAdmin || isManager) {
      fetchUsers();
    }
    if (id) {
      fetchTeam();
    }
  }, [id, isManager, isAdmin, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/teams/${id}`);
      const team = response.data.team;
      const members = response.data.members || [];
      setFormData({
        name: team.name || '',
        description: team.description || '',
        manager_id: team.manager_id || '',
        member_ids: members.map((m) => m.id),
      });
    } catch (error) {
      console.error('Error fetching team:', error);
      setError('Failed to load team');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare payload - only send fields expected by backend validation
      const payload = {
        name: formData.name,
        description: formData.description || null,
      };
      
      // Only include manager_id if it's a valid number (don't send empty string)
      if (formData.manager_id && formData.manager_id !== '') {
        const managerId = parseInt(formData.manager_id);
        if (!isNaN(managerId)) {
          payload.manager_id = managerId;
        }
      }

      if (id) {
        await axios.put(`${API_URL}/api/teams/${id}`, payload);
        const currentMembers = await axios.get(`${API_URL}/api/teams/${id}`);
        const currentMemberIds = (currentMembers.data.members || []).map((m) => m.id);
        
        for (const memberId of formData.member_ids) {
          if (!currentMemberIds.includes(memberId)) {
            await axios.post(`${API_URL}/api/teams/${id}/members`, { user_id: memberId });
          }
        }
        
        for (const memberId of currentMemberIds) {
          if (!formData.member_ids.includes(memberId)) {
            await axios.delete(`${API_URL}/api/teams/${id}/members/${memberId}`);
          }
        }
      } else {
        const response = await axios.post(`${API_URL}/api/teams`, payload);
        for (const memberId of formData.member_ids) {
          await axios.post(`${API_URL}/api/teams/${response.data.team.id}/members`, {
            user_id: memberId,
          });
        }
      }
      navigate('/teams');
    } catch (error) {
      console.error('Team save error:', error);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.errors?.[0]?.msg 
        || error.message 
        || 'Failed to save team';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (userId) => {
    setFormData({
      ...formData,
      member_ids: formData.member_ids.includes(userId)
        ? formData.member_ids.filter((id) => id !== userId)
        : [...formData.member_ids, userId],
    });
  };

  return (
    <div className="form-page-container">
      <div className="form-header">
        <h1 className="form-title">{id ? 'Edit Team' : 'Create New Team'}</h1>
        <p className="form-subtitle">Fill in the details to {id ? 'update' : 'create'} a team</p>
      </div>

      <div className="form-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter team name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Enter team description"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Team Members</label>
            <div className="form-checkbox-group">
              {users.map((user) => (
                <label key={user.id} className="form-checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.member_ids.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                  />
                  <span className="form-checkbox-label">
                    {user.name} <span className="form-checkbox-email">({user.email})</span>
                  </span>
                </label>
              ))}
            </div>
            {formData.member_ids.length > 0 && (
              <small className="form-hint form-hint-success">
                {formData.member_ids.length} member{formData.member_ids.length > 1 ? 's' : ''} selected
              </small>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  <span>Saving...</span>
                </>
              ) : (
                id ? 'Update Team' : 'Create Team'
              )}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/teams')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamForm;
