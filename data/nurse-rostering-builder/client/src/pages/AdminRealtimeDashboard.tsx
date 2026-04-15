import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Clock, Users, TrendingUp, RefreshCw } from "lucide-react";

interface NurseStatus {
  id: number;
  name: string;
  position: string;
  currentShift: "day" | "evening" | "night" | "off";
  shiftStart: string;
  shiftEnd: string;
  ward: string;
  status: "working" | "break" | "off" | "absent";
  lastUpdate: string;
  careerYears: number;
}

export function AdminRealtimeDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());

  // Mock real-time nurse data
  const [nurseStatuses, setNurseStatuses] = useState<NurseStatus[]>([
    {
      id: 1,
      name: "김영희",
      position: "간호사",
      currentShift: "day",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      ward: "101 병동",
      status: "working",
      lastUpdate: "방금 전",
      careerYears: 5,
    },
    {
      id: 2,
      name: "이순신",
      position: "간호사",
      currentShift: "evening",
      shiftStart: "16:00",
      shiftEnd: "00:00",
      ward: "101 병동",
      status: "working",
      lastUpdate: "2분 전",
      careerYears: 3,
    },
    {
      id: 3,
      name: "박민준",
      position: "간호사",
      currentShift: "night",
      shiftStart: "00:00",
      shiftEnd: "08:00",
      ward: "101 병동",
      status: "working",
      lastUpdate: "5분 전",
      careerYears: 1,
    },
    {
      id: 4,
      name: "정수현",
      position: "수간호사",
      currentShift: "day",
      shiftStart: "08:00",
      shiftEnd: "16:00",
      ward: "101 병동",
      status: "break",
      lastUpdate: "10분 전",
      careerYears: 8,
    },
    {
      id: 5,
      name: "최민지",
      position: "간호사",
      currentShift: "off",
      shiftStart: "-",
      shiftEnd: "-",
      ward: "-",
      status: "off",
      lastUpdate: "어제",
      careerYears: 2,
    },
  ]);

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastRefreshTime(new Date());
      // In production, fetch real data from tRPC
      setNurseStatuses((prev) =>
        prev.map((nurse) => ({
          ...nurse,
          lastUpdate:
            Math.random() > 0.7
              ? "방금 전"
              : Math.random() > 0.5
                ? "1분 전"
                : "2분 전",
        }))
      );
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working":
        return "bg-green-100 text-green-800";
      case "break":
        return "bg-yellow-100 text-yellow-800";
      case "off":
        return "bg-gray-100 text-gray-800";
      case "absent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "working":
        return "근무 중";
      case "break":
        return "휴식 중";
      case "off":
        return "휴무";
      case "absent":
        return "미출근";
      default:
        return status;
    }
  };

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case "day":
        return "bg-yellow-100 text-yellow-800";
      case "evening":
        return "bg-orange-100 text-orange-800";
      case "night":
        return "bg-blue-100 text-blue-800";
      case "off":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case "day":
        return "일근";
      case "evening":
        return "저녁";
      case "night":
        return "야간";
      case "off":
        return "휴무";
      default:
        return shift;
    }
  };

  const workingNurses = nurseStatuses.filter((n) => n.status === "working");
  const breakNurses = nurseStatuses.filter((n) => n.status === "break");
  const offNurses = nurseStatuses.filter((n) => n.status === "off");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">실시간 간호사 현황</h1>
            <p className="text-muted-foreground mt-1">
              마지막 업데이트: {lastRefreshTime.toLocaleTimeString("ko-KR")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {autoRefresh ? "자동 새로고침 중" : "자동 새로고침 중지"}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">근무 중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{workingNurses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">명</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">휴식 중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{breakNurses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">명</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">휴무</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">{offNurses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">명</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 인원</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{nurseStatuses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">명</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">전체 ({nurseStatuses.length})</TabsTrigger>
            <TabsTrigger value="working">근무 중 ({workingNurses.length})</TabsTrigger>
            <TabsTrigger value="break">휴식 중 ({breakNurses.length})</TabsTrigger>
            <TabsTrigger value="off">휴무 ({offNurses.length})</TabsTrigger>
          </TabsList>

          {/* All Nurses Tab */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>전체 간호사 현황</CardTitle>
                <CardDescription>모든 간호사의 실시간 상태</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {nurseStatuses.map((nurse) => (
                    <div
                      key={nurse.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-semibold text-sm">{nurse.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{nurse.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {nurse.position} • {nurse.careerYears}년 경력
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge className={getShiftColor(nurse.currentShift)} variant="secondary">
                            {getShiftLabel(nurse.currentShift)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {nurse.shiftStart} - {nurse.shiftEnd}
                          </p>
                        </div>

                        <div className="text-right min-w-[100px]">
                          <p className="text-sm font-medium">{nurse.ward}</p>
                          <p className="text-xs text-muted-foreground">{nurse.lastUpdate}</p>
                        </div>

                        <Badge className={getStatusColor(nurse.status)}>
                          {getStatusLabel(nurse.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Working Nurses Tab */}
          <TabsContent value="working" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>근무 중인 간호사</CardTitle>
                <CardDescription>{workingNurses.length}명이 현재 근무 중입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {workingNurses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    근무 중인 간호사가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workingNurses.map((nurse) => (
                      <div
                        key={nurse.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-green-50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{nurse.name}</p>
                          <p className="text-sm text-muted-foreground">{nurse.ward}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getShiftColor(nurse.currentShift)}>
                            {getShiftLabel(nurse.currentShift)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {nurse.shiftStart} - {nurse.shiftEnd}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Break Nurses Tab */}
          <TabsContent value="break" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>휴식 중인 간호사</CardTitle>
                <CardDescription>{breakNurses.length}명이 현재 휴식 중입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {breakNurses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    휴식 중인 간호사가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {breakNurses.map((nurse) => (
                      <div
                        key={nurse.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{nurse.name}</p>
                          <p className="text-sm text-muted-foreground">{nurse.ward}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getShiftColor(nurse.currentShift)}>
                            {getShiftLabel(nurse.currentShift)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Off Duty Tab */}
          <TabsContent value="off" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>휴무 중인 간호사</CardTitle>
                <CardDescription>{offNurses.length}명이 휴무 중입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {offNurses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    휴무 중인 간호사가 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {offNurses.map((nurse) => (
                      <div
                        key={nurse.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{nurse.name}</p>
                          <p className="text-sm text-muted-foreground">{nurse.position}</p>
                        </div>
                        <Badge variant="secondary">휴무</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Alert Section */}
        <Card className="mt-8 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="w-5 h-5" />
              주의 사항
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-800">
            <ul className="space-y-2 text-sm">
              <li>• 실시간 데이터는 30초마다 자동으로 업데이트됩니다</li>
              <li>• 긴급 상황 발생 시 즉시 해당 간호사에게 연락하세요</li>
              <li>• 인원 부족 시 관리자에게 알림이 전송됩니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
