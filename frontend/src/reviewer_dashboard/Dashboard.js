import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';  // Assuming you have a Navbar component
import Sidebar from '../components/Sidebar';  // Assuming you have a Sidebar component
// import AuditList from '../audit/AuditList';  // Assuming you have a Sidebar component
// import PendingAuditList from '../audit/PendingAuditList'; // Remove this import
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';

const Dashboard = () => {
  const [completedReviews, setCompletedReviews] = useState([]);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState('All');
  const { user } = useAuth();

  useEffect(() => {
    const fetchCompletedReviews = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3002/completedReviews', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setCompletedReviews(response.data);
        setError('');
        // Extract all unique application names
        const appSet = new Set();
        response.data.forEach(review => {
          if (review.menuRights && typeof review.menuRights === 'object') {
            // Try to get application name from menuRights if possible
            if (review.applicationName) {
              appSet.add(review.applicationName);
            } else if (review.menuRights.appName) {
              appSet.add(review.menuRights.appName);
            }
          }
          if (review.applicationName) {
            appSet.add(review.applicationName);
          }
        });
        // Fallback: If applicationName is not present, use a string key from menuRights
        if (appSet.size === 0) {
          response.data.forEach(review => {
            if (review.menuRights && typeof review.menuRights === 'object') {
              Object.keys(review.menuRights).forEach(key => appSet.add(key));
            }
          });
        }
        setApplications(['All', ...Array.from(appSet)]);
      } catch (err) {
        setError('Failed to fetch completed reviews.');
      }
    };
    fetchCompletedReviews();
  }, []);

  // Dynamically determine all unique rights categories
  const allRightsCategories = new Set();
  completedReviews.forEach(review => {
    if (review.menuRights && typeof review.menuRights === 'object') {
      Object.keys(review.menuRights).forEach(cat => allRightsCategories.add(cat));
    } else if (review.menuRights) {
      allRightsCategories.add('Menu Rights');
    }
    if (review.branchRights) {
      allRightsCategories.add('Branch Rights');
    }
  });
  const rightsCategories = Array.from(allRightsCategories);

  // Filter reviews by selected application
  const filteredReviews = selectedApplication === 'All'
    ? completedReviews
    : completedReviews.filter(review => {
        // Prefer applicationName field if present
        if (review.applicationName) {
          return review.applicationName === selectedApplication;
        }
        // Fallback: check if menuRights has a key matching the application
        if (review.menuRights && typeof review.menuRights === 'object') {
          return Object.keys(review.menuRights).includes(selectedApplication);
        }
        return false;
      });

  // After filtering reviews by application:
  const rightsKeysSet = new Set();
  filteredReviews.forEach(review => {
    if (review.menuRights && typeof review.menuRights === 'object') {
      Object.keys(review.menuRights).forEach(key => rightsKeysSet.add(key));
    }
  });
  const rightsKeys = Array.from(rightsKeysSet);

  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="dashboard-container">
          <h2>Completed Reviews</h2>
          {/* Dynamic Application Filter */}
          <div className="filter-section mb-3">
            <b>Filter By Application</b>
            {applications.map(app => (
              <div key={app} className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  name="applicationFilter"
                  id={app}
                  value={app}
                  checked={selectedApplication === app}
                  onChange={() => setSelectedApplication(app)}
                />
                <label className="form-check-label" htmlFor={app}>
                  {app}
                </label>
              </div>
            ))}
          </div>
          {error && <p className="text-danger">{error}</p>}
          <table className="table">
            <thead>
              <tr>
                <th>Employee Name</th>
                {rightsKeys.map(key => (
                  <th key={key}>{key}</th>
                ))}
                <th>Reviewer Remarks</th>
                <th>Action Taken</th>
                <th>Review Given By</th>
                <th>Completed Date</th>
                <th>Completed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <tr key={review._id}>
                    <td>{review.employeeName || 'N/A'}</td>
                    {rightsKeys.map(key => (
                      <td key={key}>
                        {review.menuRights && review.menuRights[key] ? review.menuRights[key] : 'N/A'}
                      </td>
                    ))}
                    <td>{review.reviewerRemarks || 'N/A'}</td>
                    <td>{review.actionTaken ? review.actionTaken.charAt(0).toUpperCase() + review.actionTaken.slice(1) : 'N/A'}</td>
                    <td>{review.reviewerName || 'N/A'}</td>
                    <td>{review.submittedAt ? new Date(review.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                    <td>{review.reviewerName || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7 + rightsKeys.length} className="text-center">No completed reviews found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
