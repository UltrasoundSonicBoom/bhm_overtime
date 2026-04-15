import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { RequestManagement } from "@/components/RequestManagement";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { ScheduleCreationDialog } from "@/components/ScheduleCreationDialog";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const { data: wards = [] } = trpc.ward.list.useQuery();

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>관리자만 접근할 수 있습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">근무표 관리</h1>
            <p className="text-muted-foreground mt-1">병동 근무 일정을 관리하고 최적화합니다</p>
          </div>
          <ScheduleCreationDialog wards={wards} />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                총 간호사
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground mt-1">활성 상태</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-500" />
                이번 달 근무표
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground mt-1">확정됨</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                대기 중인 요청
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground mt-1">오프/교환</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                규칙 위반
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">현재 상태</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="requests">요청 관리</TabsTrigger>
            <TabsTrigger value="analytics">분석</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>근무표 빌더</CardTitle>
                <CardDescription>월별 근무 일정을 생성하고 편집합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    새 근무표를 생성하거나 기존 근무표를 편집하세요
                  </p>
                  <Button>근무표 편집</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <RequestManagement
              requests={[
                {
                  id: 1,
                  type: "off",
                  nurseName: "김영희",
                  requestedDate: "2026-04-15",
                  reason: "개인 사정",
                  status: "pending",
                  createdAt: "2026-04-13",
                },
                {
                  id: 2,
                  type: "swap",
                  nurseName: "이순신",
                  requestedDate: "2026-04-16",
                  targetDate: "2026-04-17",
                  targetNurseName: "박민준",
                  reason: "가족 일정",
                  status: "pending",
                  createdAt: "2026-04-13",
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsDashboard
              month={4}
              year={2026}
              nurses={[
                {
                  name: "김영희",
                  totalHours: 160,
                  nightShifts: 6,
                  weekendShifts: 4,
                  offDays: 8,
                },
                {
                  name: "이순신",
                  totalHours: 158,
                  nightShifts: 6,
                  weekendShifts: 3,
                  offDays: 8,
                },
                {
                  name: "박민준",
                  totalHours: 162,
                  nightShifts: 5,
                  weekendShifts: 5,
                  offDays: 8,
                },
                {
                  name: "정수현",
                  totalHours: 160,
                  nightShifts: 7,
                  weekendShifts: 4,
                  offDays: 8,
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
