import { useState } from 'react';
import { registerUser } from '../api/auth';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    first_name: '',
    last_name: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(formData);
      alert('Rejestracja zakończona sukcesem!');
    } catch (error) {
      console.error(error);
      alert('Błąd rejestracji');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="username" placeholder="Nazwa użytkownika" onChange={handleChange} />
      <input type="email" name="email" placeholder="Email" onChange={handleChange} />
      <input type="password" name="password" placeholder="Hasło" onChange={handleChange} />
      <input type="password" name="password2" placeholder="Potwierdź hasło" onChange={handleChange} />
      <button type="submit">Zarejestruj</button>
    </form>
  );
};

export default Register;
