import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ARProvider } from './context/ARContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import TryOnStudio from './pages/TryOnStudio';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Favorites from './pages/Favorites';
import History from './pages/History';
import ForgotPassword from './pages/ForgotPassword';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ARProvider>
          <BrowserRouter>
              <Navbar />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/home" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/try-on" element={<TryOnStudio />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/history" element={<History />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ARProvider>
        </AuthProvider>
      </ThemeProvider>
    );
  }
