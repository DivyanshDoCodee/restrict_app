import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import Swal from "sweetalert2";

const PendingAuditList = () => {
  console.log("Rendering PendingAuditList component"); // Log component render start
  const { user } = useAuth();

  const [audits, setAudits] = useState([]);
  const [error, setError] = useState('');
  const [rights_about_to_give, setrights_about_to_give] = useState('');
  const [submitting, setSubmitting] = useState({}); // { [auditId]: boolean }
  const [submitError, setSubmitError] = useState({}); // { [auditId]: string }
  const [reviewCompleted, setReviewCompleted] = useState({}); // { [auditId]: boolean }

  useEffect(() => {
    // Fetch all audits
    const fetchAudits = async () => {
      try {
        console.log("Fetching pending audits..."); // Log before fetch
        let param = { user: user._id };
        if (user.role === "admin") { // Used === 
          param = { user: "admin" };
        }
        const response = await axios.get('http://localhost:3002/pendingAudits', {
          params: param
        });
        console.log("Pending audits fetched successfully:", response.data); // Log successful fetch and data
        setAudits(response.data);
      } catch (err) {
        console.error('Error fetching audits:', err); // Log fetch error
        setError('Failed to fetch audits');
      }
    };

    fetchAudits();
  }, []);

  console.log("Audits state:", audits); // Log audits state before return

  const giveReview = async (e, auditId) => {
    e.preventDefault();
    if (submitting[auditId]) return; // Prevent double submission
    setSubmitError(prev => ({ ...prev, [auditId]: '' }));

    // Validate review completed checkbox
    if (!reviewCompleted[auditId]) {
      setSubmitError(prev => ({ ...prev, [auditId]: 'Please check the Review Completed box before submitting.' }));
      return;
    }

    // Validate action
    const selectedAction = document.querySelector(`input[name="action-${auditId}"]:checked`)?.value;
    if (!selectedAction) {
      setSubmitError(prev => ({ ...prev, [auditId]: 'Please select Revoke or Retain.' }));
      return;
    }

    setSubmitting(prev => ({ ...prev, [auditId]: true }));
    try {
      const rowParent = e.target.closest('tr');
      const checkboxes = rowParent.querySelectorAll('input[type="checkbox"]');
      let updatedRights = {};
      let audit_id;
      updatedRights["rights"] = {};
      Array.from(checkboxes).forEach((checkbox) => {
        if (checkbox.checked) {
          const selected = checkbox.dataset.name;
          const strippedName = selected.replace("right-", "");
          const [objectId] = strippedName.split('-');
          audit_id = strippedName;
          updatedRights["rights"][objectId] = { checked: true };
        }
      });
      let aud;
      if (audit_id == undefined) {
        audit_id = e.target.dataset.auditId;
      } else {
        aud = audit_id.split("-").pop();
      }
      updatedRights["audit"] = aud;
      let review = document.querySelector("textarea[data-audit-id='" + auditId + "']").value;
      let employee = document.querySelector("input[data-audit-id='" + auditId + "'].emp_id").value;
      let application = document.querySelector("input[data-audit-id='" + auditId + "'].app_id").value;
      let rights = JSON.stringify(updatedRights);
      var obj = {
        remark: review,
        rights: rights,
        auditID: auditId,
        reviewer: user._id,
        emp: employee,
        app: application,
        action: selectedAction
      }
      await axios.post('http://localhost:3002/submitReview', obj);
      // Optimistically remove the audit from the list
      setAudits(prev => prev.filter(a => a._id !== auditId));
      setSubmitting(prev => ({ ...prev, [auditId]: false }));
      Swal.fire({
        title: "Review Given Successfully",
        icon: "success",
        timer: 1200,
        showConfirmButton: false
      });
    } catch (err) {
      setSubmitError(prev => ({ ...prev, [auditId]: 'Failed to submit review. Please try again.' }));
      setSubmitting(prev => ({ ...prev, [auditId]: false }));
    }
  };

  const addRight = async (e) => {

    const rowParent = e.target.closest('tr');
    const checkboxes = rowParent.querySelectorAll('input[type="checkbox"]');

    // Create an empty object to store the rights check in console
    let updatedRights = {};
    let audit_id;
    updatedRights["rights"] = {};
    // Loop through each checkbox and check if it's checked
    Array.from(checkboxes).forEach((checkbox) => {
      if (checkbox.checked) {
        const selected = checkbox.dataset.name;
        // Strip the "right-" prefix and extract the object ID
        const strippedName = selected.replace("right-", "");
        const [objectId] = strippedName.split('-'); // Assuming the ID is before the first hyphen
        audit_id = strippedName;
        // Create the object for this checkbox and add it to the updatedRights object
        updatedRights["rights"][objectId] = {
          checked: true
        };
      }
    });

    updatedRights["audit"] = audit_id.split("-").pop();
    // Set the new value based on the JSON
    setrights_about_to_give((prevRights) => {
      const updatedRightsObject = { ...prevRights, ...updatedRights };
      return updatedRightsObject;
    });
  };

  return (
    <div className="container mt-5">
      <h2>Pending Reviews</h2>

      {error && <p className="text-danger">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Application</th>
            <th>Rights</th>
            {/* <th>Rights</th> */}
            <th>Reviewer Remarks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {audits.length > 0 ? (
            audits.map((audit) => (
              <tr key={audit._id}>
                <td>{audit.emp_id?.name}</td>
                <td>{audit.application_id.appName}</td>
                <td>
                  {audit.application_id?.app_rights
                    ? Object.entries(audit.application_id.app_rights).map(([category, rightsArray]) => { // Iterate through categories (e.g., 'default', 'Menu Rights')
                      // Ensure rightsArray is an array before mapping over it
                      if (!Array.isArray(rightsArray)) {
                        // If it's not an array, it might be a single string right, put it in an array
                        rightsArray = [rightsArray];
                      }

                      const initialRights = audit.initialRights ? audit.initialRights.split(",") : [];

                      return (
                        <div key={category}> {/* Use category as key for the outer div */}
                          <strong>{category}:</strong> {/* Display the category name */}
                          {rightsArray.map((right, index) => { // Iterate through individual rights in the array
                            // Ensure the individual right is a string before calling toLowerCase
                            const isChecked = typeof right === 'string' && initialRights.includes(right.toLowerCase());

                            return (
                              <div key={index}> {/* Use index as key for the inner div */}
                                {right}: {/* Display the individual right */}
                                <input
                                  type="checkbox"
                                  data-name={"right" + "-" + right + "-" + audit._id} // Use the individual right in data-name
                                  onChange={addRight}
                                  defaultChecked={isChecked}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                    : "No rights"}
                  <div className='d-flex gap-2'>
                    {/* <button className='btn btn-sm btn-primary'> Revoke All Rights </button>
            <button className='btn btn-sm btn-primary'> Continue All Rights </button>
            <button className='btn btn-sm btn-primary'> Grant All Rights </button> */}
                  </div>
                  <input type="text" className='jsonRights' value={JSON.stringify(rights_about_to_give)}
                    data-audit-id={audit._id} style={{ display: 'none' }}></input>

                </td>
                {/* <td>{audit.audit_date}</td> */}
                {/* <td>{audit.rights}</td> */}
                <td>
                  <textarea placeholder='Comments' className='form-control'
                    data-audit-id={audit._id}></textarea>
                </td>

                <td>
                  <input className="emp_id" value={audit.emp_id?._id} data-audit-id={audit._id} style={{ display: 'none' }} />
                  <input className="app_id" value={audit.application_id?._id} data-audit-id={audit._id} style={{ display: 'none' }} />
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name={`action-${audit._id}`} id={`revoke-${audit._id}`} value="revoke" />
                    <label className="form-check-label" htmlFor={`revoke-${audit._id}`}>Revoke</label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name={`action-${audit._id}`} id={`retain-${audit._id}`} value="retain" />
                    <label className="form-check-label" htmlFor={`retain-${audit._id}`}>Retain</label>
                  </div>
                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`review-completed-${audit._id}`}
                      checked={!!reviewCompleted[audit._id]}
                      onChange={e => setReviewCompleted(prev => ({ ...prev, [audit._id]: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor={`review-completed-${audit._id}`}>Review Completed *</label>
                  </div>
                  <button
                    className="btn btn-success mt-2"
                    onClick={(e) => giveReview(e, audit._id)}
                    data-audit-id={audit._id}
                    disabled={!!submitting[audit._id]}
                  >
                    {submitting[audit._id] ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      'Submit'
                    )}
                  </button>
                  {submitError[audit._id] && (
                    <div className="text-danger mt-1">{submitError[audit._id]}</div>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8">No audits found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PendingAuditList;
