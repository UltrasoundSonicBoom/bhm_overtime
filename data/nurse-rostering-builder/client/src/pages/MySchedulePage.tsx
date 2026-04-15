import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { ScheduleBuilder } from "@/components/ScheduleBuilder";
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MySchedulePage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, currentMonth.getMonth() + 1));
  };

  const monthName = currentMonth.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">내 근무표</h1>
            <p className="text-muted-foreground mt-2">
              개인 근무 일정을 확인합니다
            </p>
          </div>
        </div>

        {/* Month Navigation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{monthName}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Schedule Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>근무 일정</CardTitle>
            <CardDescription>
              이 달의 근무 배정 현황을 확인합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScheduleBuilder wardId={1} year={year} month={month} />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                총 근무일
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">22</div>
              <p className="text-xs text-muted-foreground mt-1">
                이 달 근무 일수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                야간 근무
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground mt-1">
                야간 근무 횟수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                휴무일
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground mt-1">
                휴무 일수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                블록된 날
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground mt-1">
                근무 불가능한 날
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Shift Details */}
        <Card>
          <CardHeader>
            <CardTitle>근무 상세</CardTitle>
            <CardDescription>
              이 달 근무 배정 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: "2026-04-01", shift: "일근", status: "확정", color: "bg-blue-100 text-blue-800" },
                { date: "2026-04-02", shift: "저녁", status: "확정", color: "bg-purple-100 text-purple-800" },
                { date: "2026-04-03", shift: "야간", status: "확정", color: "bg-indigo-100 text-indigo-800" },
                { date: "2026-04-04", shift: "휴무", status: "확정", color: "bg-green-100 text-green-800" },
                { date: "2026-04-05", shift: "블록", status: "요청", color: "bg-red-100 text-red-800" },
              ].map((item) => (
                <div key={item.date} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium w-24">{item.date}</div>
                    <Badge className={item.color}>{item.shift}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle>대기 중인 요청</CardTitle>
            <CardDescription>
              승인 대기 중인 오프 신청 및 근무 교환
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">2026-04-10 오프 신청</p>
                  <p className="text-sm text-muted-foreground">
                    수간호사 승인 대기 중
                  </p>
                </div>
                <Badge variant="outline" className="bg-yellow-50">
                  대기 중
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">2026-04-15 근무 교환 (김영희)</p>
                  <p className="text-sm text-muted-foreground">
                    상대방 승인 대기 중
                  </p>
                </div>
                <Badge variant="outline" className="bg-yellow-50">
                  대기 중
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="gap-2">
            오프 신청하기
          </Button>
          <Button variant="outline" className="gap-2">
            근무 교환 요청하기
          </Button>
          <Button variant="outline" className="gap-2">
            블록 설정하기
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
