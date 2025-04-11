// Frontend/my-react-app/src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    // Walidacja formularza
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Wszystkie pola są wymagane');
      return false;
    }

    // Walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Podaj prawidłowy adres email');
      return false;
    }

    // Sprawdzenie czy hasła są takie same
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są takie same');
      return false;
    }

    // Sprawdzenie długości hasła
    if (formData.password.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Resetowanie błędów
    setError('');
    setSuccess('');

    // Walidacja
    if (!validateForm()) return;

    setLoading(true);

    try {
      await api.post('register/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.confirmPassword // **Important: Add password2 here to match serializer**
      });

      setSuccess('Rejestracja zakończona pomyślnie! Możesz się teraz zalogować.');

      // Przekierowanie do strony logowania po 2 sekundach
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Błąd rejestracji', error);
      if (error.response && error.response.data) {
        // Obsługa błędów z API
        if (error.response.data.username) {
          setError(`Nazwa użytkownika: ${error.response.data.username[0]}`);
        } else if (error.response.data.email) {
          setError(`Email: ${error.response.data.email[0]}`);
        } else if (error.response.data.password) {
          setError(`Hasło: ${error.response.data.password[0]}`);
        } else {
          setError('Wystąpił błąd podczas rejestracji. Spróbuj ponownie.');
        }
      } else {
        setError('Wystąpił błąd podczas rejestracji. Sprawdź połączenie z internetem.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2 className="register-title">Zarejestruj się</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Nazwa użytkownika</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="register-input"
            placeholder="Podaj nazwę użytkownika"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="register-input"
            placeholder="Podaj adres email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Hasło</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="register-input"
            placeholder="Podaj hasło (min. 8 znaków)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Potwierdź hasło</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="register-input"
            placeholder="Potwierdź hasło"
          />
        </div>

        <button
          type="submit"
          className="register-button"
          disabled={loading}
        >
          {loading ? 'Rejestracja...' : 'Zarejestruj się'}
        </button>

        <div className="login-link">
          Masz już konto? <a href="/login">Zaloguj się</a>
        </div>
      </form>
    </div>
  );
};

export default Register;