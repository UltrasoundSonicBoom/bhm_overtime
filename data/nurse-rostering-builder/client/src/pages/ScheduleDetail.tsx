import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { ScheduleBuilder } from "@/components/ScheduleBuilder";
import { ArrowLeft, Edit2, Download, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function ScheduleDetail() {
  const [status] = useState("작성 중");
  const scheduleId = 1;
  const wardId = 1;

  const statusColors = {
    "작성 중": "bg-yellow-100 text-yellow-800",
    "확정": "bg-blue-100 text-blue-800",
    "배포됨": "bg-green-100 text-green-800",
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">101 병동 - 2026년 4월</h1>
              <p className="text-muted-foreground mt-2">
                간호사 10명 | 생성일: 2026-04-01
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[status as keyof typeof statusColors]}>
              {status}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="gap-2">
            <Edit2 className="w-4 h-4" />
            편집
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            다운로드
          </Button>
          <Button variant="outline" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            확정
          </Button>
        </div>

        {/* Schedule Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>근무표</CardTitle>
            <CardDescription>
              월간 근무 배정 현황을 확인합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScheduleBuilder wardId={wardId} year={2026} month={4} />
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">총 근무일</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">240</div>
              <p className="text-sm text-muted-foreground mt-2">
                10명 × 24일 (공휴일 제외)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">야간 근무</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">80</div>
              <p className="text-sm text-muted-foreground mt-2">
                전체 근무의 33%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">휴무일</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">60</div>
              <p className="text-sm text-muted-foreground mt-2">
                간호사당 평균 6일
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Nurse Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>간호사별 근무 현황</CardTitle>
            <CardDescription>
              각 간호사의 월간 근무 배정 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">간호사 {i}</p>
                    <p className="text-sm text-muted-foreground">
                      일근: 8일 | 저녁: 8일 | 야간: 8일 | 휴무: 6일
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">공정성 지표</p>
                    <p className="text-lg font-bold text-green-600">100%</p>
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
