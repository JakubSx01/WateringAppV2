import { useState } from 'react';
import { loginUser } from '../api/auth';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginUser(credentials);
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Nieprawidłowe dane logowania');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Nazwa użytkownika" onChange={handleChange} />
      <input type="password" name="password" placeholder="Hasło" onChange={handleChange} />
      <button type="submit">Zaloguj</button>
    </form>
  );
};

export default Login;
