
import React, { useState, useCallback } from 'react';
import { PayrollParser } from './services/payrollParser';
import type { FormattedPayrollResult, PayrollData } from './types';
import { FileUpload } from './components/FileUpload';
import { PayrollDisplay } from './components/PayrollDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Alert } from './components/Alert';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setPayrollData(null);
    setFileName(file.name);

    const parser = new PayrollParser();

    try {
      const parsedData = await parser.parseFile(file);
      // console.log('Raw Parsed Data:', parsedData); 
      const result: FormattedPayrollResult = parser.formatResult(parsedData);
      // console.log('Formatted Result:', result);

      if (result.success) {
        setPayrollData(result.data);
      } else {
        setError(result.error || '알 수 없는 파싱 오류가 발생했습니다.');
      }
    } catch (e: any) {
      console.error('File parsing error:', e);
      setError(`파일 처리 중 오류 발생: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 text-gray-100 flex flex-col items-center p-4 selection:bg-sky-500 selection:text-white">
      <Header />
      <main className="container mx-auto mt-8 p-6 bg-slate-800 shadow-2xl rounded-lg w-full max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-sky-400">급여 명세서 분석기</h1>
        
        <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />

        {isLoading && <LoadingSpinner />}
        {error && <Alert message={error} type="error" />}
        
        {payrollData && fileName && (
          <div className="mt-12">
            <h2 className="text-3xl font-semibold mb-6 text-center text-sky-300">
              분석 결과: <span className="font-normal text-gray-300">{fileName}</span>
            </h2>
            <PayrollDisplay data={payrollData} />
          </div>
        )}

        {!isLoading && !payrollData && !error && (
           <div className="mt-12 text-center text-gray-400">
            <p className="text-xl">급여 명세서 파일을 업로드하여 분석을 시작하세요.</p>
            <p className="mt-2">지원 파일 형식: CSV, XLSX</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default App;
