import React from 'react';
import Navbar from '../components/Navbar';  // Assuming you have a Navbar component
import Sidebar from '../components/Sidebar';  // Assuming you have a Sidebar component
// import AuditList from '../audit/AuditList';  // Assuming you have a Sidebar component
// import PendingAuditList from '../audit/PendingAuditList'; // Remove this import

const Dashboard = () => {
  return (
    <div className="app">
      <Navbar />
      <div className="content-wrapper">
        <Sidebar />
        <div className="dashboard-container">
          {/* Content goes here */}
          <h2>Completed Reviews</h2> {/* Add the title here */}
          {/* Remove the PendingAuditList component */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
