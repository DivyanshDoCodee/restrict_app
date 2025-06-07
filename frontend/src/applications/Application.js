import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import axios from "axios";

function App() {
  const [apps, setApps] = useState([]);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [editForm, setEditForm] = useState({
    appName: '',
    desc: '',
    frequency_id: '',
    app_rights: {}, // Initialize as an object to match backend structure
    adminEmail: '' // Initialize admin email
  });
  const [frequencies, setFrequencies] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState(''); // State for adding new category

  // Fetch applications
  useEffect(() => {
    axios
      .get("http://localhost:3002/creating")
      .then((result) => setApps(result.data))
      .catch((err) => setError("Failed to fetch apps"));
  }, []);

  // Fetch frequencies
  useEffect(() => {
    axios.get('http://localhost:3002/frequency')
      .then(response => setFrequencies(response.data))
      .catch(err => {
        console.error('Error fetching frequencies:', err);
        setFetchError('Failed to load frequencies.');
      });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this apps?")) return;

    try {
      await axios.delete(`http://localhost:3002/apps/${id}`);
      setApps(apps.filter((app) => app._id !== id));
    } catch (err) {
      setError("Failed to delete app");
    }
  };

  // Handle edit button click
  const handleEditClick = (app) => {
    setEditingApp(app);
    
    let initialAppRights = {};
    if (app.app_rights) {
      if (typeof app.app_rights === 'object' && !Array.isArray(app.app_rights)) {
        // If it's already an object (like ABC, RBMS)
        initialAppRights = app.app_rights;
      } else if (Array.isArray(app.app_rights)) {
        // If it's a simple array (like End Point backup)
        initialAppRights = { 'default': app.app_rights };
      }
      // If it's neither object nor array, initialAppRights remains {} which is handled below
    }

    // Initialize edit form from the selected app data
    setEditForm({
      appName: app.appName || '',
      desc: app.desc || '',
      frequency_id: app.frequency_id?._id || '', // Use _id if populated
      app_rights: initialAppRights, // Use the transformed or original app_rights
      adminEmail: app.adminEmail || '' // Initialize admin email
    });
    setNewCategoryName(''); // Reset new category input
    setShowModal(true);
  };

  // Handle form input changes (for appName, desc, and frequency_id dropdown)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle changes to individual rights within a category
  const handleNestedRightChange = (category, index, value) => {
    const newAppRights = { ...editForm.app_rights };
    if (newAppRights[category] && Array.isArray(newAppRights[category])) {
      newAppRights[category][index] = value;
      setEditForm(prev => ({ ...prev, app_rights: newAppRights }));
    }
  };

  // Handle adding a new right to a specific category
  const handleAddNestedRight = (category) => {
    const newAppRights = { ...editForm.app_rights };
    if (!newAppRights[category] || !Array.isArray(newAppRights[category])) {
      newAppRights[category] = []; // Ensure it's an array
    }
    newAppRights[category].push(''); // Add a new empty right
    setEditForm(prev => ({ ...prev, app_rights: newAppRights }));
  };

  // Handle removing a right from a specific category
  const handleRemoveNestedRight = (category, index) => {
    const newAppRights = { ...editForm.app_rights };
    if (newAppRights[category] && Array.isArray(newAppRights[category])) {
      newAppRights[category] = newAppRights[category].filter((_, i) => i !== index);
      // Optionally remove category if it becomes empty
      // if (newAppRights[category].length === 0) {
      //   delete newAppRights[category];
      // }
      setEditForm(prev => ({ ...prev, app_rights: newAppRights }));
    }
  };

  // Handle adding a new category
  const handleAddCategory = () => {
    if (newCategoryName.trim() === '') return; // Prevent adding empty category
    const newAppRights = { ...editForm.app_rights };
    if (!newAppRights[newCategoryName]) {
      newAppRights[newCategoryName] = []; // Initialize new category with an empty array
      setEditForm(prev => ({ ...prev, app_rights: newAppRights }));
      setNewCategoryName(''); // Clear the input
    }
  };

  // Handle removing a category
  const handleRemoveCategory = (categoryToRemove) => {
    const newAppRights = { ...editForm.app_rights };
    delete newAppRights[categoryToRemove];
    setEditForm(prev => ({ ...prev, app_rights: newAppRights }));
  };

  // Handle form submission for editing application
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingApp) return;

    try {
      const response = await axios.put(`http://localhost:3002/apps/${editingApp._id}`, editForm);
      // Re-fetch all apps to ensure populated data is correct after update
      fetchApps();

      setShowModal(false);
    } catch (err) {
      console.error('Error updating application:', err);
      setError('Failed to update application details.');
    }
  };

  // Function to re-fetch applications - important for showing updated populated data
  const fetchApps = async () => {
    try {
      const response = await axios.get("http://localhost:3002/creating");
      setApps(response.data);
      setError(null); // Clear error on successful fetch
    } catch (err) {
      console.error('Error fetching apps after update:', err);
      setError("Failed to re-fetch apps after update.");
    }
  };

  // Handle Enable/Disable button click
  const handleStatusChange = async (app) => {
    const newStatus = !app.status; // Toggle the current status
    try {
      // Send PUT request to update the application status
      await axios.put(`http://localhost:3002/apps/${app._id}/status`, { status: newStatus });
      
      // Update the local state to reflect the status change
      setApps(apps.map(a => 
        a._id === app._id ? { ...a, status: newStatus } : a
      ));

    } catch (err) {
      console.error('Error updating application status:', err);
      // Log the specific error response if available
      if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Error request:', err.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', err.message);
      }
      setError('Failed to update application status.');
    }
  };

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />

        {(error || fetchError) && <p className="text-danger">Error: {error || fetchError}</p>}
        <div className="container mt-5">
          <h2>Application List</h2>
          <a href='/applicationcreate'>
            <button  className='btn btn-md btn-primary'>Create New Application</button>
          </a>
          <br/>
          <br/>
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Application Name</th>
              <th>Frequency</th>

              <th>Last Audit Date</th>
              <th>Next Audit Date</th>

              <th>Description Notes</th>
              <th>Admin Email</th>
              <th>App Rights</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
  {apps.map((app, i) => (
    <tr key={app._id}>
      <td>{app.appName}</td>
      {/* Display frequency name from populated object */}
      <td>{app.frequency_id?.name || "N/A"}</td>
      <td> <small className="text-muted">{app.last_audit_date ? new Date(app.last_audit_date).toLocaleDateString() : 'No review done'}</small></td>
<td>{new Date(app.next_audit_date).toLocaleDateString()}</td>

      <td>{app.desc}</td>
      <td>{app.adminEmail}</td>
      <td>
        {/* Display app_rights as badges - consistently handle nested object structure */}
        {app.app_rights && typeof app.app_rights === 'object' ? (
          // Get all values (arrays of rights) from the app_rights object
          Object.values(app.app_rights)
            .filter(Array.isArray) // Only process values that are arrays
            .flat() // Flatten the array of arrays into a single array of rights
            .map((right, index) => (
              <span key={`${app._id}-right-${index}`} className="badge bg-info me-1">
                {right}
              </span>
            ))
        ) : Array.isArray(app.app_rights) && app.app_rights.length > 0 ? (
          // Fallback for cases where app_rights might still be a simple array (though modal converts this)
          app.app_rights.map((right, index) => (
            <span key={`${app._id}-array-fallback-${index}`} className="badge bg-info me-1">
              {right}
            </span>
          ))
        ) : (
          <span className="text-muted">No rights assigned</span>
        )}
      </td>
      <td>
        {/* Status cell */}
        {app.status ? (
          <span className="badge bg-success">Enabled</span>
        ) : (
          <span className="badge bg-danger">Disabled</span>
        )}
      </td>
      <td>
        <button className="btn btn-primary btn-sm me-2 mb-2" onClick={() => handleEditClick(app)}>
          Modify
        </button>
        {/* <button className="btn btn-danger btn-sm" onClick={() => handleDelete(app._id)}>
          Delete
        </button> */}
        <button className="btn btn-secondary btn-sm mt-2" onClick={() => handleStatusChange(app)}>
          {app.status ? "Disable" : "Enable"}
        </button>
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </div>

    {/* Edit Modal */}
    {showModal && editingApp && (
      <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Modify Application Details</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Application Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="appName"
                    value={editForm.appName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description Notes</label>
                  <textarea
                    className="form-control"
                    name="desc"
                    value={editForm.desc}
                    onChange={handleInputChange}
                    rows="3"
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Application Admin Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="adminEmail"
                    value={editForm.adminEmail}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                {/* Frequency ID selection dropdown */}
                <div className="mb-3">
                  <label className="form-label">Frequency</label>
                  {fetchError && <p className="text-danger">{fetchError}</p>}
                  <select
                    className="form-select"
                    name="frequency_id"
                    value={editForm.frequency_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Frequency</option>
                    {frequencies.map(freq => (
                      <option key={freq._id} value={freq._id}>
                        {freq.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">App Rights</label>
                  {/* Edit interface for nested app_rights object */}
                  {editForm.app_rights && typeof editForm.app_rights === 'object' && (
                    Object.keys(editForm.app_rights).map(category => (
                      <div key={category} className="mb-3 p-2 border rounded">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h5>{category}</h5>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleRemoveCategory(category)}
                          >
                            Remove Category
                          </button>
                        </div>
                        {Array.isArray(editForm.app_rights[category]) && editForm.app_rights[category].map((right, index) => (
                          <div key={index} className="input-group mb-2">
                            <input
                              type="text"
                              className="form-control"
                              value={right}
                              onChange={(e) => handleNestedRightChange(category, index, e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleRemoveNestedRight(category, index)}
                            >
                              Remove Right
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => handleAddNestedRight(category)}
                        >
                          Add Right to {category}
                        </button>
                      </div>
                    ))
                  )}

                  {/* Input for adding a new category */}
                  <div className="input-group mt-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="New Category Name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleAddCategory}
                    >
                      Add New Category
                    </button>
                  </div>

                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    )}


    </div>
  );
}

export default App;
