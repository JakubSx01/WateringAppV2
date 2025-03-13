import React, { useState } from 'react';
import api from '../services/api';
import '../styles/Login.css'; // Zakładamy, że plik Login.css znajduje się w katalogu src/styles

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('token/', { username, password });
      localStorage.setItem('token', response.data.access);
      alert('Zalogowano pomyślnie!');
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
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />
        <button type="submit" className="login-button">Zaloguj</button>
      </form>
    </div>
  );
};

export default Login;
