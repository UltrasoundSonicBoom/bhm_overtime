import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface NurseStatistics {
  name: string;
  totalHours: number;
  nightShifts: number;
  weekendShifts: number;
  offDays: number;
}

interface AnalyticsDashboardProps {
  nurses: NurseStatistics[];
  month: number;
  year: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AnalyticsDashboard({ nurses, month, year }: AnalyticsDashboardProps) {
  // Prepare data for charts
  const hoursByNurse = nurses.map((n) => ({
    name: n.name,
    hours: n.totalHours,
  }));

  const nightShiftsByNurse = nurses.map((n) => ({
    name: n.name,
    nights: n.nightShifts,
  }));

  const weekendDistribution = nurses.map((n) => ({
    name: n.name,
    value: n.weekendShifts,
  }));

  // Calculate statistics
  const totalHours = nurses.reduce((sum, n) => sum + n.totalHours, 0);
  const avgHours = Math.round(totalHours / nurses.length);
  const totalNightShifts = nurses.reduce((sum, n) => sum + n.nightShifts, 0);
  const avgNightShifts = Math.round(totalNightShifts / nurses.length);
  const fairnessScore = calculateFairnessScore(nurses);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 근무 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">월간 평균</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">평균 야간 근무</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgNightShifts}</div>
            <p className="text-xs text-muted-foreground mt-1">회</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">공정성 지수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fairnessScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">높을수록 공정</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">총 근무 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">전체</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours by Nurse */}
        <Card>
          <CardHeader>
            <CardTitle>간호사별 근무 시간</CardTitle>
            <CardDescription>
              {year}년 {month}월 근무 시간 분포
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hoursByNurse}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Night Shifts by Nurse */}
        <Card>
          <CardHeader>
            <CardTitle>간호사별 야간 근무</CardTitle>
            <CardDescription>
              {year}년 {month}월 야간 근무 횟수
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={nightShiftsByNurse}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="nights" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekend Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>주말 근무 분배</CardTitle>
          <CardDescription>
            {year}년 {month}월 주말 근무 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={weekendDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {weekendDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>상세 통계</CardTitle>
          <CardDescription>
            간호사별 상세 근무 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2">간호사</th>
                  <th className="text-right py-2 px-2">총 시간</th>
                  <th className="text-right py-2 px-2">야간 근무</th>
                  <th className="text-right py-2 px-2">주말 근무</th>
                  <th className="text-right py-2 px-2">휴무일</th>
                </tr>
              </thead>
              <tbody>
                {nurses.map((nurse) => (
                  <tr key={nurse.name} className="border-b border-border hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{nurse.name}</td>
                    <td className="text-right py-2 px-2">{nurse.totalHours}h</td>
                    <td className="text-right py-2 px-2">{nurse.nightShifts}회</td>
                    <td className="text-right py-2 px-2">{nurse.weekendShifts}회</td>
                    <td className="text-right py-2 px-2">{nurse.offDays}일</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateFairnessScore(nurses: NurseStatistics[]): number {
  if (nurses.length === 0) return 100;

  // Calculate variance in hours
  const avgHours = nurses.reduce((sum, n) => sum + n.totalHours, 0) / nurses.length;
  const variance = nurses.reduce((sum, n) => sum + Math.pow(n.totalHours - avgHours, 2), 0) / nurses.length;
  const stdDev = Math.sqrt(variance);

  // Calculate variance in night shifts
  const avgNights = nurses.reduce((sum, n) => sum + n.nightShifts, 0) / nurses.length;
  const nightVariance = nurses.reduce((sum, n) => sum + Math.pow(n.nightShifts - avgNights, 2), 0) / nurses.length;
  const nightStdDev = Math.sqrt(nightVariance);

  // Fairness score: 100 - (normalized variance)
  // Lower variance = higher fairness
  const maxStdDev = avgHours * 0.3; // Allow 30% variance
  const normalizedVariance = Math.min((stdDev / maxStdDev) * 50, 50);
  const normalizedNightVariance = Math.min((nightStdDev / (avgNights + 1)) * 50, 50);

  return Math.max(0, Math.round(100 - normalizedVariance - normalizedNightVariance));
}
