import React, { useEffect, useState } from 'react';
import '../styles.css';
import Navbar from "../components/Navbar";
import Sidebar from '../components/Sidebar';
// Dashboard component
const Dashboard = () => {
  const [totalUsers, setTotalUsers] = useState(null);
  const [totalEmp, setTotalEmp] = useState(null);
  const [totalFreq, setTotalfreq] = useState(null);
  const [totalReview, setTotalreview] = useState(null);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        // Replace with your actual API URL
        const response = await fetch('http://localhost:3002/total-users');
        const data = await response.json();
        setTotalUsers(data.count); // Assuming the API returns a count field
      } catch (error) {
        console.error('Error fetching user count:', error);
      }
    };

    fetchUserCount();
  }, []);

  useEffect(() => {
    const fetchEmpCount = async () => {
      try {
        // Replace with your actual API URL
        const response = await fetch('http://localhost:3002/count-hods');
        const data = await response.json();
        setTotalEmp(data.count); // Assuming the API returns a count field
      } catch (error) {
        console.error('Error fetching user Emp:', error);
      }
    };

    fetchEmpCount();
  }, []);
  

  useEffect(() => {
    const fetchFreqCount = async () => {
      try {
        // Replace with your actual API URL
        const response = await fetch('http://localhost:3002/count-freq');
        const data = await response.json();
        setTotalfreq(data.count); // Assuming the API returns a count field
      } catch (error) {
        console.error('Error fetching user Emp:', error);
      }
    };

    fetchFreqCount();
  }, []);

  useEffect(() => {
    const fetchReviewCount = async () => {
      try {
        // Replace with your actual API URL
        const response = await fetch('http://localhost:3002/count-review');
        const data = await response.json();
        setTotalreview(data.count); // Assuming the API returns a count field
      } catch (error) {
        console.error('Error fetching user setTotalreview:', error);
      }
    };

    fetchReviewCount();
  }, []);


  return (
    <div className="app">
    <Navbar />
    <div className="content-wrapper">
      <Sidebar />
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to the Admin Dashboard!</h1>
      </div>

      {/* <div className="dashboard-content" >
        <div className="dashboard-card">
          <h3>Total Application</h3>
          {totalUsers !== null ? (
          <p>{totalUsers}</p>
        ) : (
          <p>Loading...</p>
        )}
                </div>

        <div className="dashboard-card">
          <h3>Total Emp</h3>
          {totalEmp !== null ? (
          <p>{totalEmp}</p>
        ) : (
          <p>Loading...</p>
        )}
        </div>

        <div className="dashboard-card">
          <h3>No of Reviews</h3>
          {totalReview !== null ? (
          <p>{totalReview}</p>
        ) : (
          <p>Loading...</p>
        )}    
        </div>

        <div className="dashboard-card">
          <h3>Total Frequency</h3>
          {totalFreq !== null ? (
          <p>{totalFreq}</p>
        ) : (
          <p>Loading...</p>
        )}    
            </div>
      </div>

      <div className="dashboard-footer">
        <p>Dashboard Overview - 2025</p>
      </div> */}
    </div>
    </div>

    </div>

  );

};

export default Dashboard;
