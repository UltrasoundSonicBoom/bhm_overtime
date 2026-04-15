import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function NurseProfilePage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const nurseId = parseInt(params.id || "0");

  // Mock nurse data - in production, fetch from tRPC
  const mockNurse = {
    id: nurseId,
    name: "김영희",
    email: "kim.younghee@hospital.com",
    phone: "010-1234-5678",
    careerYears: 5,
    position: "간호사",
    department: "101 병동",
    joinDate: "2021-03-15",
    certifications: ["간호사 면허", "BLS 인증", "ACLS 인증"],
    preferredShifts: ["day", "evening"],
    totalWorkDays: 185,
    nightShifts: 42,
    weekendShifts: 38,
  };

  // Mock work history data
  const mockWorkHistory = [
    {
      id: 1,
      date: "2026-04-10",
      shiftType: "day",
      duration: "08:00 - 16:00",
      ward: "101 병동",
      notes: "정상 근무",
    },
    {
      id: 2,
      date: "2026-04-09",
      shiftType: "evening",
      duration: "16:00 - 00:00",
      ward: "101 병동",
      notes: "정상 근무",
    },
    {
      id: 3,
      date: "2026-04-08",
      shiftType: "night",
      duration: "00:00 - 08:00",
      ward: "101 병동",
      notes: "정상 근무",
    },
    {
      id: 4,
      date: "2026-04-07",
      shiftType: "off",
      duration: "-",
      ward: "-",
      notes: "휴무",
    },
    {
      id: 5,
      date: "2026-04-06",
      shiftType: "day",
      duration: "08:00 - 16:00",
      ward: "101 병동",
      notes: "정상 근무",
    },
  ];

  const getShiftBadgeColor = (shiftType: string) => {
    switch (shiftType) {
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

  const getShiftLabel = (shiftType: string) => {
    switch (shiftType) {
      case "day":
        return "일근";
      case "evening":
        return "저녁";
      case "night":
        return "야간";
      case "off":
        return "휴무";
      default:
        return shiftType;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/nurses")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{mockNurse.name}</h1>
              <p className="text-muted-foreground mt-1">{mockNurse.position} • {mockNurse.department}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">입사일</p>
              <p className="text-lg font-semibold">{mockNurse.joinDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Personal Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">개인 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">이메일</p>
                  <p className="font-medium">{mockNurse.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">연락처</p>
                  <p className="font-medium">{mockNurse.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">경력</p>
                  <p className="font-medium">{mockNurse.careerYears}년</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">부서</p>
                  <p className="font-medium">{mockNurse.department}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certifications Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">자격증</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockNurse.certifications.map((cert, idx) => (
                  <Badge key={idx} variant="secondary" className="w-full justify-start">
                    ✓ {cert}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Work Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">근무 통계</CardTitle>
              <CardDescription>이번 해</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">총 근무일</span>
                  <span className="text-2xl font-bold">{mockNurse.totalWorkDays}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">야간 근무</span>
                  <span className="font-semibold">{mockNurse.nightShifts}회</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">주말 근무</span>
                  <span className="font-semibold">{mockNurse.weekendShifts}회</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">근무 기록</TabsTrigger>
            <TabsTrigger value="preferences">선호 근무</TabsTrigger>
            <TabsTrigger value="performance">성과</TabsTrigger>
          </TabsList>

          {/* Work History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>최근 근무 기록</CardTitle>
                <CardDescription>최근 30일 근무 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockWorkHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge className={getShiftBadgeColor(record.shiftType)}>
                            {getShiftLabel(record.shiftType)}
                          </Badge>
                          <div>
                            <p className="font-medium">{record.date}</p>
                            <p className="text-sm text-muted-foreground">{record.duration}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{record.ward}</p>
                        <p className="text-xs text-muted-foreground">{record.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>선호 근무 시간대</CardTitle>
                <CardDescription>근무표 생성 시 우선 반영됩니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {["day", "evening", "night"].map((shift) => (
                    <div
                      key={shift}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${
                        mockNurse.preferredShifts.includes(shift)
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      <p className="font-semibold">{getShiftLabel(shift)}</p>
                      <p className="text-sm text-muted-foreground">
                        {mockNurse.preferredShifts.includes(shift) ? "선호" : "미선호"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>성과 지표</CardTitle>
                <CardDescription>근무 성과 및 통계</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">근무 충실도</span>
                    <span className="text-2xl font-bold text-green-600">98%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: "98%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">공정성 점수</span>
                    <span className="text-2xl font-bold text-blue-600">92/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "92%" }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">평균 야간 근무</p>
                    <p className="text-2xl font-bold">{(mockNurse.nightShifts / 12).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">월/회</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">평균 주말 근무</p>
                    <p className="text-2xl font-bold">{(mockNurse.weekendShifts / 12).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">월/회</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
