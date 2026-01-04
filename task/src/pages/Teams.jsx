import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Teams = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (!isManager) {
      navigate('/dashboard');
      return;
    }
    fetchTeams();
  }, [isManager, navigate]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/teams`);
      setTeams(response.data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTeam) return;
    try {
      await axios.delete(`${API_URL}/api/teams/${selectedTeam.id}`);
      fetchTeams();
      setMenuOpen(null);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
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
        <h1 style={{ color: 'var(--primary-color)', fontSize: '32px', fontWeight: 700 }}>Teams</h1>
        <button className="btn btn-primary" onClick={() => navigate('/teams/new')}>
          ➕ Create Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="card">
          <p className="text-center" style={{ padding: '32px', color: 'var(--text-secondary)' }}>
            No teams found. Create your first team!
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {teams.map((team) => (
            <div
              key={team.id}
              className="card"
              style={{
                background: 'linear-gradient(135deg, #9c27b015 0%, #9c27b005 100%)',
                border: '2px solid #9c27b030',
              }}
            >
              <div className="flex-between">
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '8px', fontWeight: 700 }}>{team.name}</h3>
                  {team.description && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      {team.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="chip chip-primary">
                      👥 {team.member_count || 0} Members
                    </span>
                    {team.manager_name && (
                      <span className="chip" style={{ background: 'rgba(0,0,0,0.1)' }}>
                        Manager: {team.manager_name}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '14px' }}
                    onClick={() => {
                      setMenuOpen(menuOpen === team.id ? null : team.id);
                      setSelectedTeam(team);
                    }}
                  >
                    ⋮
                  </button>
                  {menuOpen === team.id && (
                    <div className="dropdown-menu">
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          navigate(`/teams/${team.id}/edit`);
                          setMenuOpen(null);
                        }}
                      >
                        ✏️ Edit
                      </button>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;
