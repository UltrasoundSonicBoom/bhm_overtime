import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Mock data
const nightShiftData = [
  { name: "김영희", nights: 8 },
  { name: "이순신", nights: 8 },
  { name: "박민준", nights: 7 },
  { name: "정수현", nights: 9 },
  { name: "최지은", nights: 8 },
  { name: "이다은", nights: 8 },
  { name: "김준호", nights: 8 },
  { name: "박소영", nights: 8 },
  { name: "조은미", nights: 8 },
  { name: "이준혁", nights: 8 },
];

const weekendData = [
  { name: "김영희", weekends: 3 },
  { name: "이순신", weekends: 3 },
  { name: "박민준", weekends: 2 },
  { name: "정수현", weekends: 3 },
  { name: "최지은", weekends: 3 },
];

const fairnessData = [
  { name: "공정", value: 8, fill: "#22c55e" },
  { name: "약간 불공정", value: 2, fill: "#eab308" },
];

const COLORS = ["#22c55e", "#eab308", "#ef4444"];

export default function AnalyticsDashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">분석 대시보드</h1>
          <p className="text-muted-foreground mt-2">
            근무표의 공정성 지표 및 통계를 분석합니다
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">총 간호사</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">10</div>
              <p className="text-sm text-muted-foreground mt-2">101 병동</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">평균 야간근무</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">8.1</div>
              <p className="text-sm text-muted-foreground mt-2">회/월</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">평균 주말근무</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">2.8</div>
              <p className="text-sm text-muted-foreground mt-2">회/월</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">공정성 지표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">92%</div>
              <p className="text-sm text-muted-foreground mt-2">전체 평균</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Night Shift Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>간호사별 야간근무 분포</CardTitle>
              <CardDescription>
                월간 야간근무 배정 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nightShiftData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="nights" fill="#3b82f6" name="야간근무 (회)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekend Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>간호사별 주말근무 분포</CardTitle>
              <CardDescription>
                월간 주말근무 배정 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weekendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="weekends" fill="#8b5cf6" name="주말근무 (회)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fairness Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>공정성 분포</CardTitle>
              <CardDescription>
                간호사별 공정성 지표 분포
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fairnessData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {fairnessData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend */}
          <Card>
            <CardHeader>
              <CardTitle>공정성 추이</CardTitle>
              <CardDescription>
                월별 공정성 지표 변화
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { month: "1월", fairness: 85 },
                  { month: "2월", fairness: 88 },
                  { month: "3월", fairness: 90 },
                  { month: "4월", fairness: 92 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="fairness" stroke="#22c55e" name="공정성 (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>간호사별 상세 통계</CardTitle>
            <CardDescription>
              각 간호사의 근무 배정 현황 및 공정성 지표
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nightShiftData.map((nurse, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{nurse.name}</p>
                    <p className="text-sm text-muted-foreground">
                      야간: {nurse.nights}회 | 주말: {weekendData[idx % weekendData.length]?.weekends || 3}회
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">공정성</p>
                    <p className="text-lg font-bold text-green-600">
                      {Math.floor(85 + Math.random() * 15)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
