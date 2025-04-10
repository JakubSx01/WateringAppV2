import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Sprawdzenie stanu logowania przy montowaniu komponentu
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  // Nasłuchiwanie na zmiany w localStorage (logowanie/wylogowanie)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Dodajemy własne zdarzenie dla zmian w localStorage z tego samego okna
    window.addEventListener('loginStatusChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStatusChange', handleStorageChange);
    };
  }, []);

  // Obsługa wylogowania
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    
    // Odpalamy zdarzenie informujące o zmianie statusu logowania
    window.dispatchEvent(new Event('loginStatusChange'));
    
    // Przekierowanie na stronę główną
    navigate('/');
    
    // Zamknięcie menu po wylogowaniu na urządzeniach mobilnych
    setIsMenuOpen(false);
  };

  // Przełączanie menu mobilnego
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Zamknięcie menu po kliknięciu w link (dla urządzeń mobilnych)
  const closeMenu = () => {
    if (isMenuOpen) setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          PlantCare
          <i className="fas fa-leaf"></i> {/* Możesz użyć Font Awesome lub innego zestawu ikon */}
        </Link>
        
        {/* Przycisk menu hamburger (widoczny tylko na urządzeniach mobilnych) */}
        <div className="menu-icon" onClick={toggleMenu}>
          <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
        </div>
        
        {/* Lista elementów menu */}
        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={closeMenu}>
              Strona główna
            </Link>
          </li>
          
          {isLoggedIn ? (
            <>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-link" onClick={closeMenu}>
                  Moje rośliny
                </Link>
              </li>
              <li className="nav-item">
                <button className="nav-link logout-button" onClick={handleLogout}>
                  Wyloguj
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={closeMenu}>
                  Logowanie
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link register-button" onClick={closeMenu}>
                  Rejestracja
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