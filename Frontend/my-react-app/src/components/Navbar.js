// Frontend/my-react-app/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

// Accept currentUser, isAdmin, isModerator props
const Navbar = ({ currentUser, isAdmin, isModerator }) => {
  // isLoggedIn is derived from currentUser now
  const isLoggedIn = currentUser !== null;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // No need for useEffect to check token directly if using currentUser prop

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken'); // Ensure refresh token is also removed
    // Clear axios default header if set in api.js (good practice)
    // import api from '../services/api'; // <-- Import api instance if needed here
    // if (api && api.defaults && api.defaults.headers && api.defaults.headers.common) {
    //      delete api.defaults.headers.common['Authorization'];
    // }
    // Force a full page reload to clear all state and re-initialize app
    window.location.href = '/';
    // navigate('/'); // navigate might not fully reset all state if not handled carefully
  };


  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Close dropdown/menu on route change
  useEffect(() => {
      setDropdownOpen(false);
      setMenuOpen(false);
  }, [location.pathname]);


  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🌱</span>
          PlantCare
        </Link>

        <button className="hamburger" onClick={toggleMenu}>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>

        <ul className={`nav-links ${menuOpen ? 'show' : ''}`}>
          <li>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active-link' : ''}`}
            >
              Strona główna
            </Link>
          </li>

          {/* Show Dashboard link if authenticated */}
          {isLoggedIn && (
            <li>
              <Link
                to="/dashboard"
                className={`nav-link ${location.pathname === '/dashboard' ? 'active-link' : ''}`}
              >
                Moje rośliny
              </Link>
            </li>
          )}

          {/* Show Moderator Panel link if staff or admin */}
           {isLoggedIn && (isModerator || isAdmin) && (
             <li>
               <Link
                 to="/moderator-panel"
                 className={`nav-link ${location.pathname === '/moderator-panel' ? 'active-link' : ''}`}
               >
                 Panel Moderatora
               </Link>
             </li>
           )}

           {/* Show Admin Panel link if admin */}
            {isLoggedIn && isAdmin && (
              <li>
                <Link
                  to="/admin-panel"
                  className={`nav-link ${location.pathname === '/admin-panel' ? 'active-link' : ''}`}
                >
                  Panel Administratora
                </Link>
              </li>
            )}


          {/* User Menu or Login/Register links */}
          {isLoggedIn ? (
            <li className="user-menu">
               {/* Display username if available */}
              <button className="user-button" onClick={toggleDropdown}>
                <span className="user-icon">👤</span>
                {currentUser?.username || 'Moje konto'} {/* Display username or default text */}
              </button>
              <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                 {/* Add a link to user settings/profile if you create one */}
                 {/* <Link to="/profile" className="dropdown-item">Profil</Link> */}
                 <button className="logout-button" onClick={handleLogout}>
                   Wyloguj się
                 </button>
              </div>
            </li>
          ) : (
            <>
              <li>
                <Link
                  to="/login"
                  className={`nav-link ${location.pathname === '/login' ? 'active-link' : ''}`}
                >
                  Zaloguj się
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className={`nav-link ${location.pathname === '/register' ? 'active-link' : ''}`}
                >
                  Zarejestruj się
                </Link>
              </li>
            </>
          )}
           {/* Dark mode toggle etc. could go here */}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;