import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  // Check if token is saved - if yes, user is logged in
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="home-container">
      <h1 className="home-title">Witamy w aplikacji do zarządzania roślinami!</h1>
      <p className="home-description">
        Nasza aplikacja pomoże Ci w utrzymaniu przeróżnych roślin w doskonałym stanie. Dowiesz się, jakie warunki lubią Twoje rośliny oraz będziesz mógł prowadzić terminarz podlewania swoich kwiatów.
      </p>
      {token ? (
        <button className="button" onClick={handleDashboard}>
          Przejdź do dashboardu
        </button>
      ) : (
        <>
          <button className="button" onClick={handleLogin}>
            Zaloguj się
          </button>
          <button className="button" onClick={handleRegister}>
            Zarejestruj się
          </button>
        </>
      )}
    </div>
  );
};

export default Home;