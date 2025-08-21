import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Chat from './chat/Chat';
import ClaimStatus from './claims/ClaimStatus';
import PolicyCard from './policy/PolicyCard';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'policy' | 'chat' | 'claims'>('policy');

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
      
      <div className="dashboard-nav">
        <button 
          className={`nav-button ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveTab('policy')}
        >
          My Policy
        </button>
        <button 
          className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          AI Assistant
        </button>
        <button 
          className={`nav-button ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          My Claims
        </button>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'policy' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <PolicyCard />
          </div>
        )}
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'claims' && <ClaimStatus />}
      </div>
    </div>
  );
};

export default Dashboard;