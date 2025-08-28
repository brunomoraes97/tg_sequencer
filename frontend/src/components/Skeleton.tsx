import React from 'react';

interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  height = '1rem', 
  width = '100%', 
  className = '',
  lines = 1 
}) => {
  if (lines > 1) {
    return (
      <div className={`skeleton-container ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="skeleton"
            style={{
              height,
              width: index === lines - 1 ? '80%' : width,
              marginBottom: index === lines - 1 ? 0 : '0.5rem'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width }}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="card-skeleton">
    <div className="skeleton-header">
      <Skeleton width="60%" height="1.5rem" />
      <Skeleton width="80px" height="1.5rem" />
    </div>
    <div className="skeleton-body">
      <Skeleton lines={3} />
    </div>
    <div className="skeleton-actions">
      <Skeleton width="80px" height="2rem" />
      <Skeleton width="80px" height="2rem" />
    </div>
  </div>
);

export default Skeleton;
