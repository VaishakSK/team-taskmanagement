import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Users = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'employee',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    try {
      await axios.post(`${API_URL}/api/users`, formData);
      fetchUsers();
      setOpen(false);
      setFormData({ email: '', password: '', name: '', role: 'employee' });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone and will remove all associated data.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/users/${userId}`);
      fetchUsers();
      setDeleteConfirm(null);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete user');
      setDeleteConfirm(null);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <h1 style={{ color: 'var(--error-color)' }}>Access Denied</h1>
        <p>Only admins can view users.</p>
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

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'chip-error';
      case 'manager': return 'chip-warning';
      default: return 'chip-primary';
    }
  };

  return (
    <div>
      <div className="flex-between mb-3">
        <h1 style={{ color: 'var(--primary-color)', fontSize: '32px', fontWeight: 700 }}>Users</h1>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          ➕ Create User
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Email Verified</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>
                  <span className={`chip ${getRoleColor(user.role)}`}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`chip ${user.email_verified ? 'chip-success' : ''}`}>
                    {user.email_verified ? 'Verified' : 'Not Verified'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {currentUser?.id !== user.id && (
                    <button
                      className="btn btn-error"
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                      onClick={() => handleDelete(user.id)}
                      title="Delete user"
                    >
                      🗑️ Delete
                    </button>
                  )}
                  {currentUser?.id === user.id && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Current User
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px' }}>Create New User</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
