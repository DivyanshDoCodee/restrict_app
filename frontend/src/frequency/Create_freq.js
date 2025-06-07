import React, { useState } from 'react';
import axios from 'axios';
import Navbar from "../components/Navbar";
import Sidebar from '../components/Sidebar';
import Swal from "sweetalert2";

const FrequencyForm = () => {
  const [name, setName] = useState('');
  const [interval_days, setIntervalDays] = useState('');
  const [trigger_days, setTriggerDays] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const newFrequency = { 
        name, 
        interval_days, 
        trigger_days
      };

      console.log('Sending frequency data:', newFrequency); // Debug log

      const response = await axios.post('http://localhost:3002/frequency', newFrequency);
      console.log('Response:', response.data); // Debug log
      
      window.location.href = "/frequency";

    } catch (err) {
      console.error('Error creating frequency:', err);
      console.error('Error response:', err.response?.data); // Debug log
      const errorMessage = err.response?.data?.error || 'Failed to create frequency. Please try again.';
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
        <div className="container mt-5">
          <h2>Add New Frequency</h2>
          {error && <p className="text-danger">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label">Frequency Name</label>
              <input
                type="text"
                id="name"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter frequency name"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="interval_days" className="form-label">Interval (in days)</label>
              <select
                id="interval_days"
                className="form-control"
                value={interval_days}
                onChange={(e) => setIntervalDays(e.target.value)}
                required
              >
                <option value="">Select interval</option>
                <option value="7">7 days</option>
                <option value="30"> 30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
              <small className="text-muted">Select the frequency interval</small>
            </div>

            <div className="mb-3">
              <label htmlFor="trigger_days" className="form-label">Trigger Day</label>
              <input
                type="number"
                id="trigger_days"
                className="form-control"
                value={trigger_days}
                onChange={(e) => setTriggerDays(e.target.value)}
                required
                min="1"
                max="31"
                placeholder="Enter day of month (1-31)"
              />
              <small className="text-muted">Enter the day of the month when the review should trigger (1-31)</small>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Frequency'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FrequencyForm;
