// Frontend/my-react-app/src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api'; // Make sure this import is correct
import '../styles/Login.css';

// Accept onLoginSuccess prop
const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // const responseData = await loginUser({ username, password }); // Removed unused variable
            await loginUser({ username, password }); // Just call the function

            console.log('Login successful, fetching user data...');

            // --- Call the success callback and get the user object ---
            let user = null;
            if (onLoginSuccess) {
                 user = await onLoginSuccess(); // Assume onLoginSuccess returns the fetched user object or null
            }
            // --- End Call ---

            if (user) { // If user data was successfully fetched
                // Check user roles and navigate accordingly
                // Assuming is_superuser implies is_staff, but check both just in case
                if (user.is_superuser) {
                    navigate('/admin-panel');
                } else if (user.is_staff) {
                    // Moderators now go to Dashboard but could have a different initial view or extra links
                    // For now, they go to the standard dashboard. AdminPanel is only for Superusers.
                    navigate('/dashboard');
                } else {
                    navigate('/dashboard'); // Regular user
                }
           } else {
                // Fallback if fetching user data failed AFTER getting tokens (unlikely)
                console.warn("Login successful, but failed to fetch current user details. Redirecting to dashboard.");
                navigate('/dashboard');
           }


        } catch (err) {
            console.error('Login error:', err.response?.data || err.message);
            if (err.response && err.response.status === 401) {
                // Specific error message for invalid credentials
                setError(err.response.data.detail || 'Niepoprawne dane logowania. Sprawdź nazwę użytkownika i hasło.');
            } else if (err.response?.data) {
                 // Handle other potential API errors (e.g., field errors if validation changed)
                 let apiErrorMsg = 'Wystąpił błąd podczas logowania: ';
                 if (typeof err.response.data === 'object') {
                      apiErrorMsg += Object.values(err.response.data).flat().join(' ');
                 } else {
                      apiErrorMsg += err.response.data;
                 }
                 setError(apiErrorMsg);
            }
             else if (err.message === 'Network Error') {
                 setError('Błąd sieci. Sprawdź połączenie z internetem.');
             } else {
                setError('Wystąpił nieoczekiwany błąd podczas logowania. Spróbuj ponownie później.');
            }
            // Ensure tokens are cleared if login failed
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');

        } finally {
            setLoading(false);
        }
    };

    // ... rest of the component (return JSX) ...
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
                        className="form-input login-input"
                        required
                        disabled={loading}
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
                        className="form-input login-input"
                        required
                        disabled={loading}
                    />
                 </div>
                <button type="submit" className="button login-button" disabled={loading}>
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