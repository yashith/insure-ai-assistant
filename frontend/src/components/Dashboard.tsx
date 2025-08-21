import React from 'react';
import { useAuth } from '../context/AuthContext';
import Chat from './chat/Chat';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.username}!</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      <div className="dashboard-content">
        <Chat />
      </div>
    </div>
  );
};

export default Dashboard;