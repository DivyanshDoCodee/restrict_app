// import logo from './logo.svg';
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route,Navigate  } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
// import Sidebar from './components/Sidebar';
// import Navbar from './components/Navbar';
// import MainContent from './components/MainContent';
import Signup from './pages/Signup';  
import Login from './pages/Login';  

import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import CreateApp from './applications/CreateApp';
import Application from './applications/Application';  

import UpdateUser from './UpdateUser';

import Dashboard from './pages/Dashboard';

import Frequency from './frequency/Create_freq';

import FrequencyIndex from './frequency/Frequency';

import EmployeeCreate from './employee/CreateEmployee';

import Employee from './employee/IndexEmoloyee';
import HODs from './hod/HodIndex';

import Reviewer from './reviewer_dashboard/Dashboard'

import Logout from "./pages/Logout";


import User from './user/createUser';
import { useAuth } from "./auth/AuthContext";

import Audit from './audit/create_audit';
import RoleBasedDashboard from './pages/RoleBasedDashboard';
import AuditList from './audit/AuditList';
import UploadExcel from './excel/UploadExcel';
import ChangePassword from './reviewer_dashboard/changepass';
import UploadEmployees from './employee/UploadEmployees';
import UploadHods from './hod/UploadHod';
import CreateAdmin from './user/CreateAdmin';

function App() {
  
  const { isAuthenticated, user } = useAuth();

  return (
    <AuthProvider>
       <Router>
        <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
          <Route path='/register' element={<Signup />}></Route>
          <Route path='/' element={isAuthenticated ? <Navigate to="/dashboard"/> : <Login />}></Route>
          
          <Route path='/dashboard' element={
            <ProtectedRoute>
              <RoleBasedDashboard/>
            </ProtectedRoute>
          }></Route>

          <Route path='/logout' element={
            <ProtectedRoute>
              <Logout />
            </ProtectedRoute>
          }></Route>

          <Route path='/create_frequency' element={<Frequency />}></Route>
          <Route path='/frequency' element={<FrequencyIndex />}></Route>


          <Route path='/app' element={
            <ProtectedRoute>
              <Application />
            </ProtectedRoute>}></Route>
          <Route path='/applicationcreate' element={
             <ProtectedRoute>
            <CreateApp />
            </ProtectedRoute>}></Route>
          <Route path='/update' element={<UpdateUser />}></Route>
        
          <Route path='/employeescreate' element={
            <ProtectedRoute>
              <EmployeeCreate />
            </ProtectedRoute>
          }></Route>

          <Route path='/employees' element={
              <ProtectedRoute>
                <Employee />
              </ProtectedRoute>
           }></Route>

            <Route path='/hods' element={
              <ProtectedRoute>
                <HODs/>
              </ProtectedRoute>
           }></Route>

          {/* <Route path='/reviewer' element={<Reviewer />}></Route> */}
          <Route path='/hodcreate' element={
             <ProtectedRoute>
              <User />
             </ProtectedRoute>
            }></Route>

            <Route path='/pastReviews' element={
             <ProtectedRoute>
              <AuditList />
             </ProtectedRoute>
            }></Route>

            <Route path='/myEmployees' element={
             <ProtectedRoute>
              
             </ProtectedRoute>
            }></Route>

            <Route path='/uploadExcel' element={
             <ProtectedRoute>
                <UploadExcel/>
             </ProtectedRoute>
            }></Route>
<Route path='/uploademployee' element={
             <ProtectedRoute>
                <UploadEmployees/>
             </ProtectedRoute>
            }></Route>


<Route path='/uploadhod' element={
             <ProtectedRoute>
                <UploadHods/>
             </ProtectedRoute>
            }></Route>
          <Route path='/create_audit' element={<Audit />}></Route>
          <Route path='/create_admin' element={
            <ProtectedRoute>
              <CreateAdmin />
            </ProtectedRoute>
          }></Route>


        </Routes>
        </Router>
      </AuthProvider>
  );
}

export default App;
