import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Swal from "sweetalert2";

const ChangePassword = () => {
    const { user } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage("New passwords don't match!");
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post('http://localhost:3002/change-password', {
                userId: user._id,
                oldPassword,
                newPassword
            });

            Swal.fire({
                title: "Password Changed Successfully",
                icon: "success",
            }).then((result) => {
                window.location.href = "/change-password";
            });

            setError('');
        } catch (err) {
            setError('Failed to create  Please try again.');
            console.error(err);
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
    
                    <div className="change-password-card">
                        <h2 className="change-password-title">Change Password</h2>
                        {message && <p className="change-password-message">{message}</p>}

                        <form onSubmit={handlePasswordChange}>
                            <div className="change-password-input-group">
                                <label className="change-password-label">Old Password</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="change-password-input"
                                    required
                                />
                            </div>

                            <div className="change-password-input-group">
                                <label className="change-password-label">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="change-password-input"
                                    required
                                />
                            </div>

                            <div className="change-password-input-group">
                                <label className="change-password-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="change-password-input"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="change-password-button"
                                disabled={loading}
                            >
                                {loading ? 'Updating...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
