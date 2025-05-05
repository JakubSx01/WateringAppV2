// Frontend/my-react-app/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

// Accept currentUser, isAdmin, isModerator props
const Navbar = ({ currentUser, isAdmin, isModerator }) => {
  // isLoggedIn is derived from currentUser now
  const isLoggedIn = currentUser !== null;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    // Clearing axios default header is handled in api.js interceptor on refresh failure/logout
    // A full page reload is the most reliable way to clear all state after logout
    window.location.href = '/';
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
          {/* Home link (always visible) */}
          <li>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active-link' : ''}`}
            >
              Strona główna
            </Link>
          </li>

          {/* Group authenticated-only links inside a Fragment */}
          {isLoggedIn && (
            <> {/* Fragment to hold Dashboard and Admin/Mod links if the user is logged in */}
              <li>
                <Link
                  to="/dashboard"
                  className={`nav-link ${location.pathname === '/dashboard' ? 'active-link' : ''}`}
                >
                  Moje rośliny
                </Link>
              </li>

              {/* Show Admin Panel link if the user is Admin OR Moderator */}
              {(isModerator || isAdmin) && (
                <li>
                  <Link
                    to="/admin-panel"
                    className={`nav-link ${location.pathname === '/admin-panel' ? 'active-link' : ''}`}
                  >
                    Panel Administratora
                  </Link>
                </li>
              )}
            </>
          )} {/* End Fragment for authenticated-only links */}


          {/* User Menu OR Login/Register links */}
          {isLoggedIn ? (
            <li className="user-menu">
              <button className="user-button" onClick={toggleDropdown}>
                <span className="user-icon">👤</span>
                {currentUser?.username || 'Moje konto'}
              </button>
              <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                 {/* Optional profile link: <Link to="/profile" className="dropdown-item">Profil</Link> */}
                 <button className="logout-button" onClick={handleLogout}>
                   Wyloguj się
                 </button>
              </div>
            </li>
          ) : (
            <> {/* Fragment to hold Login and Register links */}
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