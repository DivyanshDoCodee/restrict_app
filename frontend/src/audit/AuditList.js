import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Swal from 'sweetalert2';

const AuditList = () => {
  const { user } = useAuth();

  const [audits, setAudits] = useState([]);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState('All');
  const [displayedRightsCategories, setDisplayedRightsCategories] = useState([]); // State to store unique categories from displayed audits
  const [editingAuditId, setEditingAuditId] = useState(null); // State to track which audit is being edited (original rights edit state)
  const [editedRights, setEditedRights] = useState({}); // State to store edited rights values (original rights edit state)
  const [isSaving, setIsSaving] = useState(false); // State to track saving status (original rights edit state)
  const [mandatoryRemarksAuditIds, setMandatoryRemarksAuditIds] = useState([]); // New state to track audits where remarks are mandatory
  const [reviewCompleted, setReviewCompleted] = useState({}); // { [auditId]: boolean }
  const [selectedActions, setSelectedActions] = useState({});

  // Handler for modify button (now primarily for making remarks mandatory)
  const handleModify = (auditId) => {
    setMandatoryRemarksAuditIds(prevIds => [...prevIds, auditId]);
    // We don't need to set editingAuditId or initialize editedRights here
  };

  // Handler for rights input change (keeping the function but it won't be called if rights editing is removed from render)
  const handleRightsChange = (auditId, category, value) => {
    setEditedRights(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // Handler for save button (keeping the function but it won't be used if Save button is removed from render)
  const handleSave = async (auditId) => {
    try {
      setIsSaving(true);
      setError('');

      // Original save logic for rights (will not be triggered from the UI)
      const audit = audits.find(a => a._id === auditId);
      if (!audit) {
        throw new Error('Audit not found');
      }

      const updatedRights = {};
      Object.entries(editedRights).forEach(([category, value]) => {
        if (value.trim() !== '') {
          updatedRights[category] = value.split(',').map(v => v.trim());
        }
      });

      const updateData = {
        auditId,
        rights: updatedRights,
        reviewer: user._id,
        emp: audit.emp_id._id,
        app: audit.application_id._id
      };

      const response = await axios.post('http://localhost:3002/updateAuditRights', updateData);

      if (response.data.success) {
        setAudits(prevAudits => 
          prevAudits.map(a => 
            a._id === auditId 
              ? { ...a, excelRightsData: { ...a.excelRightsData, ...updatedRights } }
              : a
          )
        );
        
        setEditingAuditId(null);
        setEditedRights({});
        
        alert('Rights updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update rights');
      }
    } catch (error) {
      console.error('Error saving rights:', error);
      setError(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for cancel button (keeping the function but it won't be used if Cancel button is removed from render)
  const handleCancel = () => {
    setEditingAuditId(null);
    setEditedRights({});
    setError('');
  };

  // Handler for submit button
  const handleSubmit = async (auditId) => {
    // Validate review completed checkbox
    if (!reviewCompleted[auditId]) {
      setError('Please check the Review Completed box before submitting.');
      return;
    }
    try {
      // Get the remark value from the textarea
      const remarkTextarea = document.querySelector(`textarea[data-audit-id='${auditId}']`);
      const remark = remarkTextarea.value;

      // Check if remarks are mandatory for this audit and if the field is empty
      if (mandatoryRemarksAuditIds.includes(auditId) && remark.trim() === '') {
        alert('Reviewer Remarks are mandatory for this submission.');
        remarkTextarea.style.borderColor = 'red';
        return;
      }
      remarkTextarea.style.borderColor = '';

      // Get the selected action from state
      const selectedAction = selectedActions[auditId];
      if (!selectedAction) {
        alert('Please select an action (Revoke, Retain, or Modify).');
        return;
      }

      const audit = audits.find(a => a._id === auditId);
      if (!audit || !audit.emp_id || !audit.application_id) {
        console.error('Audit data is incomplete for submission.', audit);
        alert('Unable to submit review due to missing information.');
        return;
      }

      // Gather rights data
      let rightsDetails = '';
      if (audit.excelRightsData && typeof audit.excelRightsData === 'object') {
        for (const category in audit.excelRightsData) {
          if (audit.excelRightsData.hasOwnProperty(category)) {
            const rightsArray = audit.excelRightsData[category];
            if (Array.isArray(rightsArray) && rightsArray.length > 0) {
              rightsDetails += `${category}: ${rightsArray.join(', ')}; `;
            }
          }
        }
      }

      // Log the request payload for debugging
      const payload = {
        auditID: auditId,
        remark,
        rights: audit.excelRightsData || {},
        reviewer: user._id,
        reviewerName: user.name,
        emp: audit.emp_id._id,
        app: audit.application_id._id,
        action: selectedAction
      };
      console.log('Submitting review:', payload);

      // Call /submitReview to save the completed review
      await axios.post('http://localhost:3002/submitReview', payload);

      Swal.fire({
        title: "Review marked as completed!",
        icon: "success",
        timer: 1200,
        showConfirmButton: false
      });
      // Optionally remove from audits list or refresh
      setAudits(prev => prev.filter(a => a._id !== auditId));
    } catch (error) {
      console.error('Error handling submit:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
        alert(error.response.data.message);
      } else {
        setError('Failed to process the action');
      }
    }
  };

  // Fetch audits based on filter
  useEffect(() => {
    const fetchAudits = async () => {
      try {
        // Normalize the user's email for comparison
        const normalizedUserEmail = user?.email?.trim().toLowerCase();
        console.log('Fetching audits for user:', normalizedUserEmail); // Add logging

        const response = await axios.get('http://localhost:3002/pastAudits', {
          params: {
            user: user?.role === 'admin' ? 'admin' : user?._id,
            application: selectedApplication
          }
        });

        // Filter audits based on normalized email comparison
        const filteredAudits = response.data.filter(audit => {
          if (user?.role === 'admin') return true;
          
          const auditHodEmail = audit.user_id?.email?.trim().toLowerCase();
          const isAssignedToHod = auditHodEmail === normalizedUserEmail;
          
          console.log(`Audit HOD email: ${auditHodEmail}, Matches user: ${isAssignedToHod}`); // Add logging
          
          return isAssignedToHod && audit.status === true;
        });

        console.log('Filtered audits:', filteredAudits); // Add logging
        setAudits(filteredAudits);

        // Extract unique rights categories from all audits
        const categories = new Set();
        filteredAudits.forEach(audit => {
          if (audit.excelRightsData) {
            Object.keys(audit.excelRightsData).forEach(category => {
              categories.add(category);
            });
          }
        });
        setDisplayedRightsCategories(Array.from(categories));

      } catch (err) {
        console.error('Error fetching audits:', err);
        setError('Failed to fetch audits');
      }
    };

    fetchAudits();
  }, [user, selectedApplication]);

  // Fetch all applications (only for the filter dropdown, not for category headers)
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get('http://localhost:3002/creating'); // Fetch all applications
        setApplications(response.data); // Store applications for the filter dropdown

      } catch (err) {
        console.error('Error fetching applications:', err);
        // Handle error, maybe set an error state for the applications fetch
      }
    };

    fetchApplications();
  }, []); // Run once on component mount

  /*
   * Helper function to render the content of the rights cell.
   * Displays value from excel if header matches user-defined right, or if it's an additional excel 'rights' header.
   * Highlights user-defined rights in red if not found in excel.
   */
  const renderRightsCell = (audit, category, applications) => {
    // Get the rights data from the audit
    const rightsData = audit.excelRightsData || {};
    
    // If the category exists in the rights data, display it
    if (rightsData.hasOwnProperty(category)) {
      const value = rightsData[category];
      // Handle both array and string values
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return value;
    }
    
    return '-';
  };

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="dashboard-container">
          <div className="container mt-5">
            <h2>Pending Reviews</h2>
            {/* Filter Section */}
            <div className="filter-section mb-3">
              <h5>Filter By Application</h5>
              {applications.map((app) => (
                <div key={app._id} className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="applicationFilter"
                    id={app._id}
                    value={app._id}
                    checked={selectedApplication === app._id}
                    onChange={() => setSelectedApplication(app._id)}
                  />
                  <label className="form-check-label" htmlFor={app._id}>
                    {app.appName}
                  </label>
                </div>
              ))}
            </div>
            {error && <p className="text-danger">{error}</p>}
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  {/* Removed Application header */}
                  {/* <th>Application</th> */}
                  {/* Dynamically generated rights columns from unique categories in displayed audits */}
                  {displayedRightsCategories.map(category => (
                    <th key={category}>{category}</th>
                  ))}
                  <th>Reviewer Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {audits.length > 0 ? (
                  audits.map((audit) => (
                    <tr key={audit._id}>
                      <td>
                        {audit.emp_id && typeof audit.emp_id === 'object' && audit.emp_id.name 
                          ? audit.emp_id.name
                          : 'N/A'}
                      </td>
                      {displayedRightsCategories.map(category => (
                        <td key={category}>{renderRightsCell(audit, category, applications)}</td>
                      ))}
                      <td>
                        <label htmlFor={`remarks-${audit._id}`}> {mandatoryRemarksAuditIds.includes(audit._id) && <span className="text-danger">*</span>}</label>
                        <textarea placeholder='Comments' className='form-control'
                          id={`remarks-${audit._id}`}
                          data-audit-id={audit._id}
                          defaultValue={audit.reviewer_remarks || ""}
                        ></textarea>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`action-${audit._id}`}
                              id={`revoke-${audit._id}`}
                              value="revoke"
                              checked={selectedActions[audit._id] === 'revoke'}
                              onChange={() => {
                                setSelectedActions(prev => ({ ...prev, [audit._id]: 'revoke' }));
                                setMandatoryRemarksAuditIds(prev => prev.filter(id => id !== audit._id));
                              }}
                            />
                            <label className="form-check-label" htmlFor={`revoke-${audit._id}`}>Revoke</label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`action-${audit._id}`}
                              id={`retain-${audit._id}`}
                              value="retain"
                              checked={selectedActions[audit._id] === 'retain'}
                              onChange={() => {
                                setSelectedActions(prev => ({ ...prev, [audit._id]: 'retain' }));
                                setMandatoryRemarksAuditIds(prev => prev.filter(id => id !== audit._id));
                              }}
                            />
                            <label className="form-check-label" htmlFor={`retain-${audit._id}`}>Retain</label>
                          </div>
                          <div className="form-check mt-2">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`action-${audit._id}`}
                              id={`modify-${audit._id}`}
                              value="modify"
                              checked={selectedActions[audit._id] === 'modify'}
                              onChange={() => {
                                setSelectedActions(prev => ({ ...prev, [audit._id]: 'modify' }));
                                handleModify(audit._id);
                              }}
                            />
                            <label className="form-check-label" htmlFor={`modify-${audit._id}`}>Modify</label>
                          </div>
                          <div className="form-check mt-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`review-completed-${audit._id}`}
                              checked={!!reviewCompleted[audit._id]}
                              onChange={e => setReviewCompleted(prev => ({ ...prev, [audit._id]: e.target.checked }))}
                            />
                            <label className="form-check-label" htmlFor={`review-completed-${audit._id}`}><span className="text-danger">*</span>Review Completed  </label>
                          </div>
                          <button 
                            className="btn btn-secondary btn-sm mt-2" 
                            onClick={() => handleSubmit(audit._id)}
                          >
                            Submit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No audits found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditList;