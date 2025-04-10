import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('token/', { username, password });
      // Store both access and refresh tokens
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      alert('Zalogowano pomyślnie!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Błąd logowania', error);
      alert('Niepoprawne dane logowania');
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Logowanie</h2>
      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Nazwa użytkownika"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
          required
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />
        <button type="submit" className="login-button">Zaloguj</button>
      </form>
    </div>
  );
};

export default Login;