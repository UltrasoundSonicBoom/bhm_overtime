
import React from 'react';
import { InformationCircleIcon, ExclamationTriangleIcon } from './Icons';

interface AlertProps {
  message: string;
  type?: 'info' | 'error';
}

export const Alert: React.FC<AlertProps> = ({ message, type = 'info' }) => {
  const bgColor = type === 'error' ? 'bg-red-700' : 'bg-sky-700';
  const borderColor = type === 'error' ? 'border-red-500' : 'border-sky-500';
  const textColor = type === 'error' ? 'text-red-100' : 'text-sky-100';
  const Icon = type === 'error' ? ExclamationTriangleIcon : InformationCircleIcon;

  return (
    <div className={`p-4 my-6 border-l-4 ${borderColor} ${bgColor} ${textColor} rounded-r-lg shadow-md flex items-start`} role="alert">
      <Icon className={`w-6 h-6 mr-3 flex-shrink-0 ${type === 'error' ? 'text-red-300' : 'text-sky-300'}`} />
      <div>
        <p className="font-semibold">{type === 'error' ? '오류 발생' : '알림'}</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};
