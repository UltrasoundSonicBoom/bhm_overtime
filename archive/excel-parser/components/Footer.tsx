
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6 mt-12 text-center">
      <p className="text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Payroll Parser WebApp. All rights reserved.
      </p>
       <p className="text-xs text-gray-500 mt-1">
        Built with React, TypeScript, and Tailwind CSS.
      </p>
    </footer>
  );
};
