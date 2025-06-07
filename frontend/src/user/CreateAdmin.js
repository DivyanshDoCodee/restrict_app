import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Swal from "sweetalert2";

const CreateAdmin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const newAdmin = {
        name,
        email,
        password,
      };

      const response = await axios.post('http://localhost:3002/create-admin', newAdmin);

      Swal.fire({
        title: 'Admin User Created Successfully',
        icon: 'success',
      }).then((result) => {
        // Redirect to a relevant page after successful creation, e.g., admin dashboard or user list
        navigate('/dashboard'); // You might want to change this redirect path
      });

    } catch (err) {
      console.error('Error creating admin user:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create admin user. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="container mt-5 d-flex justify-content-center align-items-center">
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Add New Admin</h2>
              {error && <p className="text-danger text-center">{error}</p>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Name</label>
                  <input
                    type="text"
                    id="name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAdmin; 