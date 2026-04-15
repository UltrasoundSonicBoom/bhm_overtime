import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Download, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SwapLog {
  id: number;
  requestingNurse: string;
  targetNurse: string;
  requestedDate: string;
  targetDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  notificationMethod?: "email" | "sms" | "both";
  createdAt: string;
}

const mockSwapLogs: SwapLog[] = [
  {
    id: 1,
    requestingNurse: "김영희",
    targetNurse: "이순신",
    requestedDate: "2026-04-02",
    targetDate: "2026-04-09",
    reason: "개인 사정으로 인한 근무 교환 요청",
    status: "approved",
    approvedBy: "박수간호사",
    approvedAt: "2026-04-01",
    notificationMethod: "both",
    createdAt: "2026-03-31",
  },
  {
    id: 2,
    requestingNurse: "박민준",
    targetNurse: "정수진",
    requestedDate: "2026-04-05",
    targetDate: "2026-04-12",
    reason: "가족 행사 참석",
    status: "pending",
    notificationMethod: "both",
    createdAt: "2026-04-01",
  },
  {
    id: 3,
    requestingNurse: "최민지",
    targetNurse: "김영희",
    requestedDate: "2026-04-15",
    targetDate: "2026-04-20",
    reason: "의료 검진",
    status: "rejected",
    approvedBy: "박수간호사",
    approvedAt: "2026-04-02",
    notificationMethod: "email",
    createdAt: "2026-03-30",
  },
  {
    id: 4,
    requestingNurse: "이순신",
    targetNurse: "박민준",
    requestedDate: "2026-04-10",
    targetDate: "2026-04-18",
    reason: "개인 사정",
    status: "approved",
    approvedBy: "박수간호사",
    approvedAt: "2026-03-29",
    notificationMethod: "both",
    createdAt: "2026-03-28",
  },
];

export default function ShiftSwapLogsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notificationFilter, setNotificationFilter] = useState<string>("all");

  const filteredLogs = mockSwapLogs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (notificationFilter !== "all" && log.notificationMethod !== notificationFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50">대기 중</Badge>;
      case "approved":
        return <Badge className="bg-green-500">승인됨</Badge>;
      case "rejected":
        return <Badge className="bg-red-500">거절됨</Badge>;
      default:
        return null;
    }
  };

  const getNotificationIcon = (method?: string) => {
    if (!method) return null;
    if (method === "email") return <Mail className="w-4 h-4" />;
    if (method === "sms") return <MessageSquare className="w-4 h-4" />;
    return (
      <>
        <Mail className="w-4 h-4" />
        <MessageSquare className="w-4 h-4" />
      </>
    );
  };

  const downloadCSV = () => {
    const headers = ["신청자", "대상자", "신청날짜", "대상날짜", "사유", "상태", "승인자", "승인일시"];
    const rows = filteredLogs.map((log) => [
      log.requestingNurse,
      log.targetNurse,
      log.requestedDate,
      log.targetDate,
      log.reason,
      log.status === "pending" ? "대기" : log.status === "approved" ? "승인" : "거절",
      log.approvedBy || "-",
      log.approvedAt || "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `shift_swap_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">근무 교환 로그</h1>
        <p className="text-gray-600 mt-2">모든 근무 교환 요청 기록을 조회합니다</p>
      </div>

      {/* 필터 및 액션 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">상태 필터</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기 중</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="rejected">거절됨</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium">알림 방식</label>
              <Select value={notificationFilter} onValueChange={setNotificationFilter}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="email">이메일만</SelectItem>
                  <SelectItem value="sms">SMS만</SelectItem>
                  <SelectItem value="both">이메일 + SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={downloadCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              CSV 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">총 요청</p>
              <p className="text-3xl font-bold mt-2">{mockSwapLogs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">승인됨</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {mockSwapLogs.filter((l) => l.status === "approved").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">대기 중</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {mockSwapLogs.filter((l) => l.status === "pending").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">거절됨</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {mockSwapLogs.filter((l) => l.status === "rejected").length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 로그 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>교환 요청 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">신청자</th>
                  <th className="text-left py-3 px-4 font-semibold">대상자</th>
                  <th className="text-left py-3 px-4 font-semibold">신청 날짜</th>
                  <th className="text-left py-3 px-4 font-semibold">대상 날짜</th>
                  <th className="text-left py-3 px-4 font-semibold">사유</th>
                  <th className="text-left py-3 px-4 font-semibold">상태</th>
                  <th className="text-left py-3 px-4 font-semibold">알림</th>
                  <th className="text-left py-3 px-4 font-semibold">승인자</th>
                  <th className="text-left py-3 px-4 font-semibold">승인일시</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      해당하는 기록이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{log.requestingNurse}</td>
                      <td className="py-3 px-4">{log.targetNurse}</td>
                      <td className="py-3 px-4">{log.requestedDate}</td>
                      <td className="py-3 px-4">{log.targetDate}</td>
                      <td className="py-3 px-4 text-gray-600">{log.reason}</td>
                      <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {getNotificationIcon(log.notificationMethod)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{log.approvedBy || "-"}</td>
                      <td className="py-3 px-4">{log.approvedAt || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 알림 방식 설명 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">알림 시스템</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>✉️ <strong>이메일 알림:</strong> 근무 교환 요청 시 대상 간호사에게 이메일로 알림 발송</p>
          <p>📱 <strong>SMS 알림:</strong> 근무 교환 요청 시 대상 간호사에게 문자로 알림 발송</p>
          <p>🔔 <strong>이메일 + SMS:</strong> 두 가지 방식으로 동시 알림 발송</p>
          <p className="text-xs text-gray-600 mt-4">
            * 알림은 요청 제출 시 즉시 발송되며, 승인/거절 시에도 신청자에게 알림이 발송됩니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
