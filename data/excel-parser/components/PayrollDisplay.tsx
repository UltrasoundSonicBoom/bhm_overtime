import React from 'react';
import type { PayrollData, PayrollItem } from '../types';
import { UserCircleIcon, CalendarDaysIcon, BanknotesIcon, ArrowDownCircleIcon, CurrencyDollarIcon, BuildingLibraryIcon, BriefcaseIcon, IdentificationIcon, StarIcon, CalendarIcon } from './Icons';

interface PayrollDisplayProps {
  data: PayrollData;
}

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
    <span className="text-sky-400">{icon}</span>
    <span className="text-sm text-gray-400">{label}:</span>
    <span className="text-gray-100 font-medium">{value || 'N/A'}</span>
  </div>
);

const ItemsTable: React.FC<{ title: string; items: PayrollItem[]; icon: React.ReactNode }> = ({ title, items, icon }) => (
  <div className="bg-slate-700 shadow-lg rounded-xl p-6">
    <h3 className="text-2xl font-semibold mb-6 text-sky-400 flex items-center">
      {icon}
      <span className="ml-2">{title}</span>
    </h3>
    {items.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left">
          <thead className="border-b border-slate-600">
            <tr>
              <th className="p-3 text-sm text-gray-400 font-semibold">항목</th>
              <th className="p-3 text-sm text-gray-400 font-semibold text-right">금액 (원)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-slate-800 hover:bg-slate-600/50 transition-colors">
                <td className="p-3 text-gray-200">{item.name}</td>
                <td className="p-3 text-gray-200 text-right">{item.numericAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-gray-400 text-center py-4">해당 항목이 없습니다.</p>
    )}
  </div>
);

interface SummaryItemProps {
  label: string;
  value: number;
  colorClass: string;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, colorClass, icon }) => (
  <div className={`p-6 rounded-xl shadow-md flex items-center space-x-4 bg-slate-700`}>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-20`}>
      {React.cloneElement(icon, { 
        className: `${icon.props.className || ''} w-8 h-8 ${colorClass}`.trim() 
      })}
    </div>
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value.toLocaleString()} 원</p>
    </div>
  </div>
);

export const PayrollDisplay: React.FC<PayrollDisplayProps> = ({ data }) => {
  const { employeeInfo, paymentDetails } = data;

  return (
    <div className="space-y-10">
      {/* Employee Info Section */}
      <section className="bg-slate-700 shadow-lg rounded-xl p-8">
        <h3 className="text-2xl font-semibold mb-6 text-sky-400 flex items-center">
          <UserCircleIcon className="w-7 h-7 mr-2" /> 직원 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem icon={<IdentificationIcon className="w-5 h-5" />} label="성명" value={employeeInfo.name} />
          <InfoItem icon={<UserCircleIcon className="w-5 h-5" />} label="개인번호" value={employeeInfo.employeeNumber} />
          <InfoItem icon={<BuildingLibraryIcon className="w-5 h-5" />} label="소속" value={employeeInfo.department} />
          <InfoItem icon={<BriefcaseIcon className="w-5 h-5" />} label="직종" value={employeeInfo.jobType} />
          <InfoItem icon={<StarIcon className="w-5 h-5" />} label="급여연차" value={employeeInfo.payGrade} />
          <InfoItem icon={<CalendarIcon className="w-5 h-5" />} label="입사년월" value={employeeInfo.hireDate} />
        </div>
      </section>

      {/* Payment Details Section */}
      <section className="bg-slate-700 shadow-lg rounded-xl p-8">
        <h3 className="text-2xl font-semibold mb-6 text-sky-400 flex items-center">
         <CalendarDaysIcon className="w-7 h-7 mr-2" /> 급여 정보
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem icon={<CalendarIcon className="w-5 h-5" />} label="급여 기간" value={paymentDetails.period} />
          <InfoItem icon={<CalendarDaysIcon className="w-5 h-5" />} label="지급일" value={paymentDetails.payDate} />
        </div>
      </section>

      {/* Salary and Deduction Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ItemsTable title="급여 항목" items={paymentDetails.salaryItems} icon={<BanknotesIcon className="w-7 h-7" />} />
        <ItemsTable title="공제 항목" items={paymentDetails.deductionItems} icon={<ArrowDownCircleIcon className="w-7 h-7" />} />
      </div>

      {/* Summary Section */}
      <section className="bg-slate-700 shadow-lg rounded-xl p-8">
        <h3 className="text-2xl font-semibold mb-6 text-sky-400 flex items-center">
          <CurrencyDollarIcon className="w-7 h-7 mr-2" /> 급여 요약
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryItem label="총 지급액" value={paymentDetails.summary.grossPay} colorClass="text-green-400" icon={<BanknotesIcon />} />
          <SummaryItem label="총 공제액" value={paymentDetails.summary.totalDeduction} colorClass="text-red-400" icon={<ArrowDownCircleIcon />} />
          <SummaryItem label="실 지급액" value={paymentDetails.summary.netPay} colorClass="text-sky-400" icon={<CurrencyDollarIcon />} />
        </div>
         {paymentDetails.summary.calculatedGrossPay !== undefined && (
          <div className="mt-6 text-xs text-slate-400 border-t border-slate-600 pt-4">
            <p>참고: 총 지급액(계산): {paymentDetails.summary.calculatedGrossPay.toLocaleString()}원, 총 공제액(계산): {paymentDetails.summary.calculatedTotalDeduction?.toLocaleString()}원, 실 지급액(계산): {paymentDetails.summary.calculatedNetPay?.toLocaleString()}원</p>
          </div>
        )}
      </section>
    </div>
  );
};