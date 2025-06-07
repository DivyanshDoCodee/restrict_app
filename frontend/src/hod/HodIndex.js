import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from "../components/Navbar";
import Sidebar from '../components/Sidebar';

const HodIndex = () => {
  const [hods, sethod] = useState([]);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedHod, setSelectedHod] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const fetchHods = async () => {
    try {
      const response = await axios.get('http://localhost:3002/hods');
      sethod(response.data);
    } catch (err) {
      setError('Error fetching HOD data.');
    }
  };

  useEffect(() => {
    fetchHods();
  }, []);

  const handleModify = (hod) => {
    setSelectedHod(hod);
    setFormData({
      name: hod.name,
      email: hod.email,
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // This handler would be more complex for managing employee assignments
  const handleEmployeeAssignmentChange = (employeeId) => {
    // Placeholder for adding/removing employeeId from formData.employees
    console.log(`Employee ID ${employeeId} assignment toggled`);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Sending update data:', formData);
      const response = await axios.put(`http://localhost:3002/hods/${selectedHod._id}`, formData);
      console.log('Backend response:', response.data);

      // After successful update, re-fetch the HOD list to get the latest populated data
      fetchHods();

      setShowModal(false);
    } catch (err) {
      console.error("Failed to update HOD:", err.response?.data || err.message);
      setError("Failed to update HOD");
    }
  };

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="container mt-5">
          <h2>HOD/Reviewer List</h2>
          <a href='/hodcreate'>
            <button  className='btn btn-md btn-primary'>Create New HOD/Reviewer</button>
          </a>
          <br/>
          <br/>
          {error && <p className="text-danger">{error}</p>}

          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Employees</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
            
              {hods.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">No HODs found</td>
                </tr>
              ) : (
                hods.map((hod) => (
                  <tr key={hod._id}>
                    <td>
                      {hod.name}
                    </td>
                    <td>
                      {hod.email}
                    </td>
                    <td>
                      {Array.isArray(hod.employees) && hod.employees.length > 0
                          ? hod.employees.map((emp) => emp.name).join(", ")
                          : "No Employees Assigned"}
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => handleModify(hod)}>
                        Modify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedHod && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Modify HOD/Reviewer Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                    <button type="submit" className="btn btn-primary">Save changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodIndex;
