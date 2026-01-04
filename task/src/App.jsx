import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Homepage from './pages/Homepage.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import OTPVerification from './pages/OTPVerification.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import TaskForm from './pages/TaskForm.jsx';
import Teams from './pages/Teams.jsx';
import TeamForm from './pages/TeamForm.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Layout from './components/Layout.jsx';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
          </Route>
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Tasks />} />
            <Route path="new" element={<TaskForm />} />
            <Route path=":id/edit" element={<TaskForm />} />
          </Route>
          <Route
            path="/teams"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Teams />} />
            <Route path="new" element={<TeamForm />} />
            <Route path=":id/edit" element={<TeamForm />} />
          </Route>
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Reports />} />
          </Route>
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Users />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
