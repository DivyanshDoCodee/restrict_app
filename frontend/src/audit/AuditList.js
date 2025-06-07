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
    try {
      // Get the remark value from the textarea
      const remarkTextarea = document.querySelector(`textarea[data-audit-id='${auditId}']`);
      const remark = remarkTextarea.value;

      // Check if remarks are mandatory for this audit and if the field is empty
      if (mandatoryRemarksAuditIds.includes(auditId) && remark.trim() === '') {
        alert('Reviewer Remarks are mandatory for this submission.');
        // You can add visual indication here, like changing the border color of the textarea
        remarkTextarea.style.borderColor = 'red';
        return;
      }

      // Reset border color if validation passes
      remarkTextarea.style.borderColor = '';

      // Get the selected radio button value
      const selectedAction = document.querySelector(`input[name="action-${auditId}"]:checked`)?.value;
      if (!selectedAction) {
        alert('Please select an action (Revoke or Retain).');
        return;
      }

      const audit = audits.find(a => a._id === auditId);
      if (!audit || !audit.emp_id || !audit.application_id) {
        console.error('Audit data is incomplete for drafting email.', audit);
        alert('Unable to draft email due to missing information.');
        return;
      }

      const employeeName = audit.emp_id.name;
      const adminEmail = audit.application_id.adminEmail;
      // Use the selected action text
      const actionText = selectedAction === 'revoke' ? 'Revoked' : 'Retained';

      // Format the rights data from excelRightsData (keeping this for context in the email if needed)
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

      // Make API call to send notification
      const response = await axios.post('http://localhost:3002/sendReviewNotification', {
        auditId: auditId,
        selectedAction: selectedAction, // Send the selected action
        remark: remark, // Send the remark
        employeeName: employeeName,
        adminEmail: adminEmail,
        rightsDetails: rightsDetails,
        reviewerName: user.name // Assuming user object is available and has a name property
      });

      if (response.data.success) {
        Swal.fire({
          title: "Review Action Recorded and Notification Sent",
          icon: "success",
        }).then((result) => {
          // Optionally refresh the page or update the state
          window.location.reload();
        });
      } else {
        Swal.fire({
          title: "Error",
          text: response.data.message || "Failed to send review notification.",
          icon: "error",
        });
      }

    } catch (error) {
      console.error('Error handling submit:', error);
      setError('Failed to process the action');
    }
  };

  // Fetch audits based on filter
  useEffect(() => {
    const fetchAudits = async () => {
      try {
        let param = { user: user._id };
        if(user.role === "admin"){
          param = {user: "admin"};
        }
        
        if (selectedApplication !== 'All') {
          param.application = selectedApplication;
        }

        const response = await axios.get('http://localhost:3002/pastAudits', {
          params: param
        });

        const fetchedAudits = response.data; // Get the fetched audits
        console.log('Fetched audits data:', fetchedAudits); // Log the fetched data
        setError(''); // Clear error on successful fetch

        // Process audits to fetch employee names if not populated
        const processedAudits = await Promise.all(fetchedAudits.map(async audit => {
          // Check if emp_id is not a populated object with a name
          if (audit.emp_id && typeof audit.emp_id !== 'object') {
            try {
              // Fetch employee details separately by ID
              const empResponse = await axios.get(`http://localhost:3002/employee/${audit.emp_id}`);
              // If employee found, update the audit object with populated emp_id
              if (empResponse.data) {
                return { ...audit, emp_id: empResponse.data }; // Replace ID with the employee object
              }
            } catch (empError) {
              console.error(`Error fetching employee details for ID ${audit.emp_id}:`, empError);
              // Keep the original audit if fetching fails
            }
          }
          return audit; // Return original audit if already populated or fetching failed
        }));

        setAudits(processedAudits); // Set the state with processed audits

        // Collect unique individual rights from app_rights and additional 'rights' headers from excelRightsData
        const combinedRightsHeaders = new Set();

        processedAudits.forEach(audit => {
          // Check if the audit's application matches the selected filter
          if (selectedApplication === 'All' || (audit.application_id && audit.application_id._id === selectedApplication)) {

            // 1. Add headers from user-defined app_rights
            const userDefinedRights = new Set();
            if (audit.application_id?.app_rights && typeof audit.application_id.app_rights === 'object') {
              Object.values(audit.application_id.app_rights).forEach(rightsArray => {
                if (Array.isArray(rightsArray)) {
                  rightsArray.forEach(right => {
                     if (typeof right === 'string' && right.trim() !== '') {
                         userDefinedRights.add(right.trim());
                         combinedRightsHeaders.add(right.trim()); // Add to combined set
                     }
                  });
                } else if (typeof rightsArray === 'string' && rightsArray.trim() !== '') {
                     userDefinedRights.add(rightsArray.trim());
                     combinedRightsHeaders.add(rightsArray.trim()); // Add to combined set
                }
              });
            } else if (Array.isArray(audit.application_id?.app_rights)) {
                audit.application_id.app_rights.forEach(right => {
                    if (typeof right === 'string' && right.trim() !== '') {
                        userDefinedRights.add(right.trim());
                        combinedRightsHeaders.add(right.trim()); // Add to combined set
                    }
                });
            }

            // 2. Add headers from excelRightsData that contain 'rights' and are not already in userDefinedRights
            if (audit.excelRightsData && typeof audit.excelRightsData === 'object') {
              Object.keys(audit.excelRightsData).forEach(excelHeader => {
                if (excelHeader.toLowerCase().includes('rights')) {
                  // Add to combined set only if it's not a user-defined right
                  if (!userDefinedRights.has(excelHeader.trim())) {
                      combinedRightsHeaders.add(excelHeader.trim());
                  }
                }
              });
            } else if (Array.isArray(audit.excelRightsData)) {
               // If excelRightsData is a simple array, we might need a convention (e.g., 'default' or a specific header)
               // For now, we'll assume simple arrays are covered by user-defined rights or require specific handling if they represent other 'rights' columns.
               // If there's a case where a simple array in excelRightsData corresponds to a general 'rights' column not in app_rights, 
               // additional logic would be needed here to assign it a header name for combinedRightsHeaders.
            }
          }
        });

        setDisplayedRightsCategories(Array.from(combinedRightsHeaders)); // Set the state with combined unique headers

      } catch (err) {
        setError('Failed to fetch audits');
        console.error('Error fetching audits:', err);
        setAudits([]); // Clear audits on error
        setDisplayedRightsCategories([]); // Clear categories on error
      }
    };

    fetchAudits();
  }, [selectedApplication, user]); // Depend on selectedApplication and user

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
    // Find the application for the current audit
    const currentAuditApp = applications.find(app => app._id === audit.application_id?._id);

    // Check if the current category (column header) is a user-defined right for this application
    let isUserDefinedRight = false;
    if (currentAuditApp?.app_rights && typeof currentAuditApp.app_rights === 'object') {
        Object.values(currentAuditApp.app_rights).forEach(rightsArray => {
            if(Array.isArray(rightsArray) && rightsArray.includes(category)) {
                isUserDefinedRight = true;
            } else if (rightsArray === category) {
                isUserDefinedRight = true;
            }
        });
    } else if (Array.isArray(currentAuditApp?.app_rights) && currentAuditApp.app_rights.includes(category)){
        isUserDefinedRight = true;
    }

    // Check if the category exists as a key in the audit's excelRightsData
    const excelValue = audit.excelRightsData && typeof audit.excelRightsData === 'object' && audit.excelRightsData.hasOwnProperty(category)
                       ? audit.excelRightsData[category]
                       : undefined;

    // Logic to display based on whether it's a user-defined right or an additional excel header
    if (isUserDefinedRight) {
        if (excelValue !== undefined) {
            return Array.isArray(excelValue) ? excelValue.join(', ') : excelValue;
        } else {
            return <span>-</span>;
        }
    } else if (excelValue !== undefined) {
        return Array.isArray(excelValue) ? excelValue.join(', ') : excelValue;
    } else {
        return '-';
    }
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
                    <tr key={audit._id}> {/* Ensure no extra whitespace around tr */}
                      <td> {/* Display employee name if populated, otherwise N/A */}
                        {/* Check if emp_id is a populated object with a name */}
                        {audit.emp_id && typeof audit.emp_id === 'object' && audit.emp_id.name 
                          ? audit.emp_id.name
                          : 'N/A' // Display N/A if emp_id is null, not an object, or object without name
                        }
                      </td>
                      {/* Display rights under dynamic columns */}
                      {displayedRightsCategories.map(category => (
                        <td key={category}> {/* Use category as key for td */}
                          {renderRightsCell(audit, category, applications)}
                        </td>
                      ))}
                      <td> {/* Ensure no extra whitespace around td */}
                        {/* Add label and conditional asterisk for mandatory remarks */}
                        <label htmlFor={`remarks-${audit._id}`}> {mandatoryRemarksAuditIds.includes(audit._id) && <span className="text-danger">*</span>}</label>
                        <textarea placeholder='Comments' className='form-control'
                          id={`remarks-${audit._id}`} // Add an id for the label to reference
                          data-audit-id={audit._id} // Add data-audit-id to easily select the textarea
                          defaultValue={audit.reviewer_remarks || ""} // Use empty string for default if no remarks exist
                          ></textarea>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <div className="form-check">
                            <input className="form-check-input" type="radio" name={`action-${audit._id}`} id={`revoke-${audit._id}`} value="revoke" />
                            <label className="form-check-label" htmlFor={`revoke-${audit._id}`}>
                              Revoke
                            </label>
                          </div>
                          <div className="form-check">
                            <input className="form-check-input" type="radio" name={`action-${audit._id}`} id={`retain-${audit._id}`} value="retain" />
                            <label className="form-check-label" htmlFor={`retain-${audit._id}`}>
                              Retain
                            </label>
                          </div>
                          {/* Add back the Modify button */}
                          {!mandatoryRemarksAuditIds.includes(audit._id) && (
                            <button 
                              className="btn btn-primary btn-sm" 
                              onClick={() => handleModify(audit._id)}
                            >
                              Modify
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleSubmit(audit._id)}
                          >
                            Submit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr> {/* Ensure no extra whitespace around tr */}
                    <td colSpan={2 + displayedRightsCategories.length} className="text-center">No audits found</td> {/* Adjust colspan, ensure no extra whitespace */}
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
