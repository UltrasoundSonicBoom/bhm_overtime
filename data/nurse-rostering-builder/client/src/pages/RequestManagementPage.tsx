import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";

// Mock data
const mockOffRequests = [
  {
    id: 1,
    nurse: "김영희",
    date: "2026-04-15",
    reason: "개인 사정",
    status: "대기",
    requestedAt: "2026-04-10",
  },
  {
    id: 2,
    nurse: "이순신",
    date: "2026-04-20",
    reason: "병원 방문",
    status: "승인",
    requestedAt: "2026-04-08",
  },
  {
    id: 3,
    nurse: "박민준",
    date: "2026-04-25",
    reason: "가족 행사",
    status: "거절",
    requestedAt: "2026-04-09",
  },
];

const mockSwapRequests = [
  {
    id: 1,
    nurse1: "정수현",
    nurse2: "최지은",
    date: "2026-04-18",
    status: "대기",
    requestedAt: "2026-04-11",
  },
  {
    id: 2,
    nurse1: "이다은",
    nurse2: "김준호",
    date: "2026-04-22",
    status: "승인",
    requestedAt: "2026-04-09",
  },
];

const statusColors = {
  "대기": "bg-yellow-100 text-yellow-800",
  "승인": "bg-green-100 text-green-800",
  "거절": "bg-red-100 text-red-800",
};

const statusIcons = {
  "대기": <Clock className="w-4 h-4" />,
  "승인": <CheckCircle className="w-4 h-4" />,
  "거절": <XCircle className="w-4 h-4" />,
};

export default function RequestManagementPage() {
  const [offRequests] = useState(mockOffRequests);
  const [swapRequests] = useState(mockSwapRequests);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">요청 관리</h1>
          <p className="text-muted-foreground mt-2">
            오프 신청 및 근무 교환 요청을 관리합니다
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="off-requests" className="w-full">
          <TabsList>
            <TabsTrigger value="off-requests">
              오프 신청 ({offRequests.length})
            </TabsTrigger>
            <TabsTrigger value="swap-requests">
              근무 교환 ({swapRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Off Requests Tab */}
          <TabsContent value="off-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>오프 신청 목록</CardTitle>
                <CardDescription>
                  간호사들의 오프 신청을 검토하고 승인/거절합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>간호사</TableHead>
                      <TableHead>신청 날짜</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.nurse}</TableCell>
                        <TableCell>{request.date}</TableCell>
                        <TableCell>{request.reason}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                            {statusIcons[request.status as keyof typeof statusIcons]}
                            <span className="ml-1">{request.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.requestedAt}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "대기" && (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="text-green-600">
                                승인
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                거절
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Swap Requests Tab */}
          <TabsContent value="swap-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>근무 교환 요청 목록</CardTitle>
                <CardDescription>
                  간호사들의 근무 교환 요청을 검토하고 승인/거절합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>신청자</TableHead>
                      <TableHead>교환 대상</TableHead>
                      <TableHead>교환 날짜</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {swapRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.nurse1}</TableCell>
                        <TableCell>{request.nurse2}</TableCell>
                        <TableCell>{request.date}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                            {statusIcons[request.status as keyof typeof statusIcons]}
                            <span className="ml-1">{request.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.requestedAt}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "대기" && (
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="text-green-600">
                                승인
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                거절
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
