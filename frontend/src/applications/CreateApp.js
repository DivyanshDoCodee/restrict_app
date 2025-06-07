import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Navigate, useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";

const CreateApp = () => {
  const [frequencies, setFrequencies] = useState([]);  // To hold frequency data
  const [selectedFrequency, setSelectedFrequency] = useState('');  // Store selected frequency ID
  const [appName, setAppName] = useState('');
  const [roles, setRoles] = useState('');
  // const [status, setStatus] = useState('');
  const [last_audit_date, setLastAuditDate] = useState('');
  const [next_audit_date, setNextAuditDate] = useState('');
  const [desc, setDesc] = useState('');
  const [appRights, setAppRights] = useState(['']);  // Initial state with one input field
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [adminEmail, setAdminEmail] = useState(''); // New state for admin email

useEffect(() => {
  fetch('http://localhost:3002/frequency')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch frequencies');
      }
      // console.log(response);  // Log response object
      return response.json();
    })
    .then((data) => {
      console.log('Fetched data:', data);
      setFrequencies(data);
    })
    .catch((error) => {
      console.error('Error fetching frequencies:', error);
    });
}, []);


const handleFrequencyChange = async (e) => {
  const frequencyId = e.target.value;
  setSelectedFrequency(frequencyId);

  try {
    const response = await axios.get('http://localhost:3002/getNextAuditDate',{
      params: { frequency_id: frequencyId }  // Send frequency_id in the query parameters
    });
    setNextAuditDate(response.data.message);  // Set the next audit date from the API response
    setError('');  // Clear any previous error
  } catch (err) {
    setError('Failed to fetch the next audit date');
    setNextAuditDate(null);
  }
};
  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const newUser = {
      appName,
      roles,
      // status,
      frequency_id: selectedFrequency, // Save the selected frequency ID as referenc
      desc,
      app_rights: appRights.filter(right => right.trim() !== ''),  // Remove empty inputs
      adminEmail // Add admin email to the data being sent
    };

    try {
      const response = await axios.post('http://localhost:3002/createApplication', newUser);

      Swal.fire({
        title: "Application Created Successfullly",
        // text: "Do you want to proceed with adding this application?",
        icon: "success",
      }).then((result) => {
        window.location.href="/app";
      });

      setError('');
    } catch (err) {
      setError('Failed to create  Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle input change for app_rights
  const handleAppRightChange = (index, value) => {
    const updatedAppRights = [...appRights];
    updatedAppRights[index] = value;
    setAppRights(updatedAppRights);
  };

  // Function to add a new input field for app_rights
  const addAppRight = () => {
    setAppRights([...appRights, '']);
  };

  // Function to remove an input field for app_rights
  const removeAppRight = (index) => {
    const updatedAppRights = appRights.filter((_, i) => i !== index);
    setAppRights(updatedAppRights);
  };

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="container mt-5">
          <h2>Add new Application</h2>
          {success && <p className="text-success">{success}</p>}
          {error && <p className="text-danger">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="appName" className="form-label">Name</label>
              <input
                type="text"
                id="appName"
                className="form-control"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="adminEmail" className="form-label">Application Admin Email</label>
              <input
                type="email"
                id="adminEmail"
                className="form-control"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
            <label>Frequency:</label>
            <select required value={selectedFrequency} onChange={handleFrequencyChange} className='form-control'>
              <option value="" selected disabled>Select</option>
              {frequencies.map(frequency => (
                <option key={frequency._id} value={frequency._id}>
                  {frequency.name}
                </option>
              ))}
            </select>
            {next_audit_date && (
        <small>
          Next Review Date Would Be: <b>{ new Date(next_audit_date).toLocaleDateString('en-US', {
  weekday: 'long', // e.g. 'Monday'
  year: 'numeric', // e.g. '2025'
  month: 'long', // e.g. 'February'
  day: 'numeric' // e.g. '17'
})}</b>
        </small>
      )}
            </div>

            <div className="mb-3">
              <label htmlFor="app_rights" className="form-label">Application Rights</label>
              {appRights.map((right, index) => (
                <div key={index} className="d-flex mb-2">
                  <input
                    type="text"
                    className="form-control"
                    value={right}
                    onChange={(e) => handleAppRightChange(index, e.target.value)}
                    placeholder="Enter app right"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-danger ms-2"
                    onClick={() => removeAppRight(index)}
                    disabled={appRights.length === 1}
                  >
                    -
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-success"
                onClick={addAppRight}
              >
                +
              </button>
            </div>

            <div className="mb-3">
              <label htmlFor="desc" className="form-label">Description/Notes</label>
              <textarea
                id="desc"
                className="form-control"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Additional notes about the application"
                rows="3"
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Add Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateApp;
