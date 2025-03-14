import { useState } from 'react';
import { registerUser } from '../api/auth';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await registerUser(formData);
      alert('Rejestracja zakończona sukcesem!');
      window.location.href = '/login';
    } catch (error) {
      console.error('Błąd rejestracji:', error.response.data);
      alert('Błąd rejestracji: ' + JSON.stringify(error.response.data));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Nazwa użytkownika" onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      <input type="text" name="first_name" placeholder="Imię" onChange={handleChange} />
      <input type="text" name="last_name" placeholder="Nazwisko" onChange={handleChange} />
      <input type="password" name="password" placeholder="Hasło" onChange={handleChange} />
      <input type="password" name="password2" placeholder="Potwierdź hasło" onChange={handleChange} />
      <button type="submit">Zarejestruj</button>
    </form>
  );
};

export default Register;
