import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-icon">{getIcon()}</div>
      <div className="alert-content">
        <div className="alert-title">{title}</div>
        {message && <div className="alert-message">{message}</div>}
      </div>
      {onClose && (
        <button className="alert-close" onClick={onClose}>
          ✖
        </button>
      )}
    </div>
  );
};

export default Alert;
