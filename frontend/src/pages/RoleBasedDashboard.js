import { useAuth } from "../auth/AuthContext";
import Dashboard from "./Dashboard";
import Reviewer from "../reviewer_dashboard/Dashboard";
import React from 'react';


const RoleBasedDashboard = () => {
  const { user } = useAuth();

  if (!user) return <h2>Loading...</h2>;

  // Render the Reviewer dashboard for admin or hod roles
  return user.role === "admin" || user.role === "hod" ? <Reviewer /> : null;
};

export default RoleBasedDashboard;