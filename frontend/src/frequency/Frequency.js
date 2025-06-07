import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from "../components/Navbar";
import Sidebar from '../components/Sidebar';
import Swal from 'sweetalert2'; // Import SweetAlert for confirmation
// import FrequencyForm from './FrequencyForm';

const FrequencyIndex = () => {
  const [frequencies, setFrequencies] = useState([]);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for modal visibility
  const [currentFrequency, setCurrentFrequency] = useState(null); // State for the frequency being edited
  const [editFormData, setEditFormData] = useState({ // State for the form data in the modal
    name: '',
    interval_days: '',
    trigger_days: '',
  });

  // Fetch frequencies from the backend
  const fetchFrequencies = async () => {
    try {
      const response = await axios.get('http://localhost:3002/frequency');
      setFrequencies(response.data);
      setError('');
    } catch (err) {
      setError('Error fetching frequencies.');
      console.error('Error fetching frequencies:', err);
    }
  };

  useEffect(() => {
    fetchFrequencies();
  }, []);

  // Handle input changes in the edit modal form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  // Handle edit button click
  const handleEditClick = (frequency) => {
    setCurrentFrequency(frequency);
    setEditFormData({ // Pre-fill the form with the frequency data
      name: frequency.name,
      interval_days: frequency.interval_days,
      trigger_days: frequency.trigger_days,
    });
    setIsEditModalOpen(true); // Open the modal
  };

  // Handle delete button click
  const handleDeleteClick = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Call backend delete endpoint (will implement this next)
          await axios.delete(`http://localhost:3002/frequency/${id}`);
          Swal.fire(
            'Deleted!',
            'The frequency has been deleted.',
            'success'
          );
          fetchFrequencies(); // Refresh the list after deletion
        } catch (err) {
          Swal.fire(
            'Error!',
            'Failed to delete the frequency.',
            'error'
          );
          console.error('Error deleting frequency:', err);
        }
      }
    });
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentFrequency) return; // Should not happen if modal is opened correctly

    try {
      // Call backend update endpoint (will implement this next)
      await axios.put(`http://localhost:3002/frequency/${currentFrequency._id}`, editFormData);
      Swal.fire(
        'Updated!',
        'The frequency has been updated.',
        'success'
      );
      setIsEditModalOpen(false); // Close the modal
      fetchFrequencies(); // Refresh the list after update
    } catch (err) {
      Swal.fire(
        'Error!',
        'Failed to update the frequency.',
        'error'
      );
      console.error('Error updating frequency:', err);
    }
  };

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="container mt-5">
       
          <h2>Frequencies</h2>
          <a href='/create_frequency'>
            <button  className='btn btn-md btn-primary'>Create New Frequency</button>
          </a>
          {error && <p className="text-danger">{error}</p>}
         
        
          {frequencies.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Frequency Name</th>
                  <th>Interval (Days)</th>
                  <th>Trigger Days</th>
                  <th className='d-none'>Status</th>
                  <th>Actions</th> {/* New Actions column */}
                </tr>
              </thead>
              <tbody>
                {frequencies.map((frequency) => (
                  <tr key={frequency._id}>
                    <td>{frequency.name}</td>
                    <td>{frequency.interval_days}</td>
                    <td>{frequency.trigger_days}</td>
                    <td className='d-none'>{frequency.status}</td>
                    <td>
                      <button 
                        className='btn btn-sm btn-warning me-2' // me-2 for right margin
                        onClick={() => handleEditClick(frequency)}
                      >
                        Edit
                      </button>
                      <button 
                        className='btn btn-sm btn-danger'
                        onClick={() => handleDeleteClick(frequency._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No frequencies found.</p>
          )}

          {/* Edit Frequency Modal */}
          {isEditModalOpen && currentFrequency && (
            <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Frequency</h5>
                    <button type="button" className="btn-close" onClick={() => setIsEditModalOpen(false)}></button>
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleEditSubmit}>
                      <div className="mb-3">
                        <label htmlFor="name" className="form-label">Frequency Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="name" 
                          name="name" 
                          value={editFormData.name} 
                          onChange={handleInputChange} 
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="interval_days" className="form-label">Interval (Days)</label>
                         <select 
                            className='form-control' 
                            id="interval_days" 
                            name="interval_days" 
                            value={editFormData.interval_days} 
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">Select Interval</option>
                            <option value="7">7</option>
                            <option value="30">30</option>
                            <option value="90">90</option>
                            <option value="180">180</option>
                          </select>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="trigger_days" className="form-label">Trigger Days</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="trigger_days" 
                          name="trigger_days" 
                          value={editFormData.trigger_days} 
                          onChange={handleInputChange} 
                          required
                          min="1"
                          max="31"
                        />
                      </div>
                       <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Close</button>
                        <button type="submit" className="btn btn-primary">Save changes</button>
                      </div>
                    </form>
                  </div>
                 
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FrequencyIndex;
