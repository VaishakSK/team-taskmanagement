import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import '../Login.css';
import '../App.css';

const Homepage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && user.id) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'chip-error';
      case 'manager': return 'chip-warning';
      default: return 'chip-primary';
    }
  };

  return (
    <div className="homepage-wrapper">
      {/* Header */}
      <header className="homepage-header">
        <div className="homepage-header-content">
          <div className="homepage-logo">
            <h1 className="homepage-logo-text">Task Manager</h1>
            {user && user.id && (
              <span className={`chip ${getRoleColor(user.role)}`} style={{ marginLeft: '16px', fontSize: '12px', padding: '4px 10px' }}>
                {user.role.toUpperCase()}
              </span>
            )}
          </div>
          <nav className="homepage-nav">
            {user && user.id ? (
              <button 
                className="homepage-nav-link homepage-nav-link-primary" 
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button className="homepage-nav-link" onClick={() => navigate('/login')}>
                  Sign In
                </button>
                <button 
                  className="homepage-nav-link homepage-nav-link-primary" 
                  onClick={() => navigate('/signup')}
                >
                  Get Started
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="homepage-hero">
        <div className="homepage-hero-content">
          <h1 className="homepage-hero-title">
            Manage Your Teams and Tasks
            <span className="homepage-hero-highlight"> Efficiently</span>
          </h1>
          <p className="homepage-hero-subtitle">
            Streamline your workflow with our powerful task management system. 
            Collaborate with your team, track progress, and achieve your goals faster.
          </p>
          <div className="homepage-hero-actions">
            <button
              className="btn btn-primary btn-large"
              onClick={() => navigate('/signup')}
            >
              Get Started Free
            </button>
            <button
              className="btn btn-outline btn-large"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="homepage-features-section">
        <div className="homepage-features-container">
          <h2 className="homepage-section-title">Why Choose Task Manager?</h2>
          <div className="homepage-features-grid">
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">📊</div>
              <h3 className="homepage-feature-title">Task Management</h3>
              <p className="homepage-feature-description">
                Create, assign, and track tasks with ease. Stay organized and never miss a deadline.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">👥</div>
              <h3 className="homepage-feature-title">Team Collaboration</h3>
              <p className="homepage-feature-description">
                Work together seamlessly with your team members. Share updates and communicate effectively.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">📈</div>
              <h3 className="homepage-feature-title">Reports & Analytics</h3>
              <p className="homepage-feature-description">
                Get insights into your team's performance with detailed reports and analytics.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">🔒</div>
              <h3 className="homepage-feature-title">Secure & Reliable</h3>
              <p className="homepage-feature-description">
                Your data is safe with us. We use industry-standard security practices.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">⚡</div>
              <h3 className="homepage-feature-title">Fast & Responsive</h3>
              <p className="homepage-feature-description">
                Lightning-fast performance on all devices. Access your tasks anywhere, anytime.
              </p>
            </div>
            <div className="homepage-feature-card">
              <div className="homepage-feature-icon">🎯</div>
              <h3 className="homepage-feature-title">Role-Based Access</h3>
              <p className="homepage-feature-description">
                Flexible permission system with admin, manager, and employee roles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="homepage-cta">
        <div className="homepage-cta-content">
          <h2 className="homepage-cta-title">Ready to Get Started?</h2>
          <p className="homepage-cta-subtitle">
            Join thousands of teams already using Task Manager to streamline their workflow.
          </p>
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate('/signup')}
          >
            Create Your Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="homepage-footer-content">
          <div className="homepage-footer-section">
            <h3 className="homepage-footer-title">Task Manager</h3>
            <p className="homepage-footer-description">
              The ultimate solution for team and task management.
            </p>
          </div>
          <div className="homepage-footer-section">
            <h4 className="homepage-footer-heading">Product</h4>
            <ul className="homepage-footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
          <div className="homepage-footer-section">
            <h4 className="homepage-footer-heading">Company</h4>
            <ul className="homepage-footer-links">
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="homepage-footer-section">
            <h4 className="homepage-footer-heading">Legal</h4>
            <ul className="homepage-footer-links">
              <li><a href="#privacy">Privacy</a></li>
              <li><a href="#terms">Terms</a></li>
              <li><a href="#cookies">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="homepage-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Task Manager. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
