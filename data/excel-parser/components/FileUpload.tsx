
import React, { useRef } from 'react';
import { UploadCloudIcon } from './Icons';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-sky-600 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors duration-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        disabled={isLoading}
      />
      <button
        onClick={handleButtonClick}
        disabled={isLoading}
        className="flex flex-col items-center px-8 py-6 bg-sky-500 text-white rounded-lg shadow-md hover:bg-sky-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UploadCloudIcon className="w-16 h-16 mb-4 text-sky-200" />
        <span className="text-xl font-semibold">
          {isLoading ? '파일 처리 중...' : '급여명세서 파일 선택'}
        </span>
        <span className="text-sm mt-1 text-sky-100">(.csv 또는 .xlsx)</span>
      </button>
    </div>
  );
};
