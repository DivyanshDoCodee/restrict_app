import React from 'react';
import { Link } from 'react-router-dom';
import '../styles.css';
import { useAuth } from '../auth/AuthContext';
const Sidebar = () => {
  const { user } = useAuth();

  if (!user) {
    return <h2>Loading...</h2>;
  }

  return (
    <div className="sidebar">
      <ul>

        {user.role == "admin" && (
          <li>
            <Link to="/app">Applications</Link>
          </li>
        )}
        {user.role == "admin" && (
          <li>
            <Link to="/employees">Employees / Reviewer</Link>
          </li>
        )}
        {user.role == "admin" && (
          <li>
            <Link to="/frequency">Frequency</Link>
          </li>
        )}
        {user.role == "admin" && (
          <li>
            <Link to="/hods">Reviewers</Link>
          </li>
        )}
        {user.role == "admin" && (
          <li>
            <Link to="/create_audit">Create Review</Link>
          </li>
        )}
        <li>
          <Link to="/pastReviews">Pending Reviews          </Link>
        </li>

        <li>
          <Link to="/dashboard">Completed Reviews</Link>
        </li>
        
        {user.role == "admin" && (
          <li>
            <Link to="/uploadExcel">Upload Review Excel</Link>
          </li>
        )}
        {user.role == "admin" && (
          <li>
            <Link to="/uploademployee">Upload Employee </Link>
          </li>
        )}
        {user.role == "admin" && (
          <li>
            <Link to="/hods">Change Password For Admin</Link>
          </li>
        )}
        {/* {user.role == "admin" && (
          <li>
            <Link to="/uploadHod">Upload Reviewer</Link>
          </li>
        )} */}

        {/* {user.role == "hod" && (
          <li>
            <Link className='text-muted'>My Employees For HOD</Link>
          </li>
        )} */}
        {user.role == "hod" && (
          <li>
            <Link to="/change-password">Change Password For HOD</Link>
          </li>
        )}

        {user.role === "admin" && (
          <li>
            <Link to="/create_admin">Add New Admin</Link>
          </li>
        )}

      </ul>
    </div>
  );
};

export default Sidebar;