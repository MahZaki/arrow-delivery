import React from 'react';

const LoadingSpinner: React.FC<{ text?: string }> = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 rounded-full border-4 border-arrow-deepGreen border-t-arrow-green animate-spin mb-4"></div>
      <p className="text-arrow-green font-medium animate-pulse">{text}</p>
    </div>
  );
};

export default LoadingSpinner;