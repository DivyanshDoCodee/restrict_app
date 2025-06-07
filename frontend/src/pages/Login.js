import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import React, { Component }  from 'react';
import { useAuth } from "../auth/AuthContext";


function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();


    const handleLogin = (e) => {
        e.preventDefault();
         axios.post("http://localhost:3002/login", { email, password })
            .then(result => {
                
                if (result.data.success) {
                    
                    login(result.data.user);
                    navigate("/dashboard"); // Redirect after successful login
                } else {
                    setError("Invalid email or password"); // Show error message
                }
            })
            .catch(err => {
                console.log(err);
                setError("Login failed. Please try again.");
            });
    };
    

    return (
        <div className="d-flex justify-content-center align-items-center bg-secondary vh-100">
            <div className="bg-white p-3 rounded w-25">
                <h2>Login</h2>
                {error && <p className="text-danger">{error}</p>}
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label htmlFor="email">
                            <strong>Email</strong>
                        </label>
                        <input
                            type="email"
                            placeholder="Enter Email"
                            autoComplete="off"
                            className="form-control rounded-0"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password">
                            <strong>Password</strong>
                        </label>
                        <input
                            type="password"
                            placeholder="Enter Password"
                            autoComplete="off"
                            className="form-control rounded-0"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">
                        Login
                    </button>
                </form>
                <p>Don't have an account?</p>
                <Link to="/signup" className="btn btn-default border w-100 bg-light">
                    Signup
                </Link>
            </div>
        </div>
    );
}

export default Login;
