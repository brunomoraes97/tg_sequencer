import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="user-menu">
      <div className="user-info">
        <span>👤</span>
        <span>{user.email}</span>
      </div>
      <button onClick={logout} className="logout-btn">
        🚪 Sair
      </button>
    </div>
  );
};

export default UserMenu;
