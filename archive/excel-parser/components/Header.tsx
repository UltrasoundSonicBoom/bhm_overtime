
import React from 'react';
import { ChartBarIcon } from './Icons'; // Assuming you have an icon for logo

export const Header: React.FC = () => {
  return (
    <header className="w-full py-4 bg-slate-800/50 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-center px-4">
         <ChartBarIcon className="w-8 h-8 text-sky-400 mr-3" />
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
          급여 명세서 분석기
        </h1>
      </div>
    </header>
  );
};
