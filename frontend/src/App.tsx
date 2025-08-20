import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './components/auth/Auth';
import Dashboard from './components/Dashboard';
import './App.css';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="App">
      {user ? <Dashboard /> : <Auth />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
