import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const HeaderNav = ({ tone = 'dark' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';

  const handleBack = () => {
    if (isHome) return;

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  return (
    <div className="header-nav">
      <button
        type="button"
        className={`header-nav-btn ${tone === 'light' ? 'header-nav-btn-light' : 'header-nav-btn-dark'}`}
        onClick={handleBack}
        disabled={isHome}
        aria-label="Go back"
        title="Back"
      >
        Back
      </button>
      <button
        type="button"
        className={`header-nav-btn ${tone === 'light' ? 'header-nav-btn-light' : 'header-nav-btn-dark'}`}
        onClick={() => navigate('/')}
        aria-label="Go to homepage"
        title="Home"
      >
        Home
      </button>
    </div>
  );
};

export default HeaderNav;
