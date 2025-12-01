import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './components/LoginPage.jsx';
import UserHome from './UserHome.jsx';
import { ToastProvider } from './components/Toast.jsx';
import './styles.css';

const UserApp = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('user_access_token');
        if (token) {
            setIsLoggedIn(true);
            if (location.pathname === '/login') {
                navigate('/');
            }
        } else {
            setIsLoggedIn(false);
            if (location.pathname !== '/login') {
                navigate('/login');
            }
        }
    }, [location.pathname]);

    const handleLogin = () => {
        setIsLoggedIn(true);
        navigate('/');
    };

    return (
        <ToastProvider>
            <Routes>
                <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                <Route path="/*" element={isLoggedIn ? <UserHome /> : <LoginPage onLogin={handleLogin} />} />
            </Routes>
        </ToastProvider>
    );
};

export default UserApp;
