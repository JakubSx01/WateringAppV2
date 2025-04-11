import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Use the consolidated api service
import { loginUser } from '../services/api';
import '../styles/Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // State for error messages
    const [loading, setLoading] = useState(false); // State for loading indicator
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        setLoading(true); // Set loading state

        try {
            const response = await loginUser({ username, password });
            localStorage.setItem('token', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
             // --- Alert Removed ---
             // alert('Zalogowano pomyślnie!');
             console.log('Zalogowano pomyślnie!'); // Log instead of alert
            navigate('/dashboard'); // Redirect after successful login
        } catch (err) {
            console.error('Błąd logowania', err.response?.data || err.message);
            if (err.response && err.response.status === 401) {
                setError('Niepoprawne dane logowania. Sprawdź nazwę użytkownika i hasło.');
            } else {
                setError('Wystąpił błąd podczas logowania. Spróbuj ponownie później.');
            }
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    return (
        <div className="login-container">
            <h2 className="login-title">Logowanie</h2>

            {/* Display error message if present */}
            {error && <div className="error-message login-error">{error}</div>}

            <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                    <label htmlFor="login-username">Nazwa użytkownika</label>
                    <input
                        type="text"
                        id="login-username"
                        placeholder="Nazwa użytkownika"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="login-input"
                        required
                        disabled={loading} // Disable input while loading
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="login-password">Hasło</label>
                    <input
                        type="password"
                        id="login-password"
                        placeholder="Hasło"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                        disabled={loading} // Disable input while loading
                    />
                 </div>
                <button type="submit" className="login-button" disabled={loading}>
                    {loading ? 'Logowanie...' : 'Zaloguj'}
                </button>
            </form>
            <div className="register-link">
                Nie masz konta? <a href="/register">Zarejestruj się</a>
            </div>
        </div>
    );
};

export default Login;