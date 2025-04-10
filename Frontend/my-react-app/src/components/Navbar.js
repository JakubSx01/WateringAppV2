// Frontend/my-react-app/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Sprawdzanie, czy użytkownik jest zalogowany
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, [location]); // Sprawdzaj przy zmianie lokalizacji

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setDropdownOpen(false);
    navigate('/');
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

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
          
          {isLoggedIn ? (
            <li className="user-menu">
              <button className="user-button" onClick={toggleDropdown}>
                <span className="user-icon">👤</span>
                Moje konto
              </button>
              <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
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
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;