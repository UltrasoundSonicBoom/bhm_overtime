import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Clock, AlertCircle, Calendar } from "lucide-react";

interface ScheduleConfirmation {
  id: number;
  nurseName: string;
  month: string;
  status: "pending" | "confirmed" | "auto_confirmed";
  deadline: string;
  daysUntilDeadline: number;
  totalShifts: number;
  dayShifts: number;
  eveningShifts: number;
  nightShifts: number;
  confirmedAt?: string;
}

const mockConfirmations: ScheduleConfirmation[] = [
  {
    id: 1,
    nurseName: "김영희",
    month: "2026년 4월",
    status: "pending",
    deadline: "2026-04-05",
    daysUntilDeadline: 2,
    totalShifts: 20,
    dayShifts: 7,
    eveningShifts: 7,
    nightShifts: 6,
  },
  {
    id: 2,
    nurseName: "이순신",
    month: "2026년 4월",
    status: "confirmed",
    deadline: "2026-04-05",
    daysUntilDeadline: 2,
    totalShifts: 20,
    dayShifts: 7,
    eveningShifts: 7,
    nightShifts: 6,
    confirmedAt: "2026-04-02",
  },
  {
    id: 3,
    nurseName: "박민준",
    month: "2026년 4월",
    status: "auto_confirmed",
    deadline: "2026-04-05",
    daysUntilDeadline: 0,
    totalShifts: 20,
    dayShifts: 7,
    eveningShifts: 7,
    nightShifts: 6,
    confirmedAt: "2026-04-05",
  },
];

export default function ScheduleConfirmationPage() {
  const [confirmations, setConfirmations] = useState<ScheduleConfirmation[]>(mockConfirmations);

  const handleConfirm = (id: number) => {
    setConfirmations(
      confirmations.map((conf) =>
        conf.id === id
          ? {
              ...conf,
              status: "confirmed",
              confirmedAt: new Date().toISOString().split("T")[0],
            }
          : conf
      )
    );
  };

  const getStatusBadge = (status: string, daysUntil: number) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className={daysUntil <= 1 ? "bg-red-50 border-red-300" : "bg-yellow-50"}
          >
            {daysUntil <= 1 ? "⚠️ 긴급" : "대기 중"}
          </Badge>
        );
      case "confirmed":
        return <Badge className="bg-green-500">✓ 확인됨</Badge>;
      case "auto_confirmed":
        return <Badge className="bg-blue-500">자동 확인</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "confirmed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "auto_confirmed":
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const pendingCount = confirmations.filter((c) => c.status === "pending").length;
  const confirmedCount = confirmations.filter((c) => c.status === "confirmed").length;
  const autoConfirmedCount = confirmations.filter((c) => c.status === "auto_confirmed").length;

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">근무표 확인</h1>
        <p className="text-gray-600 mt-2">생성된 근무표를 확인하고 승인합니다</p>
      </div>

      {/* 긴급 알림 */}
      {pendingCount > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{pendingCount}명의 간호사</strong>가 아직 근무표를 확인하지 않았습니다.
            D-day가 지나면 자동으로 확인 처리됩니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">총 간호사</p>
              <p className="text-3xl font-bold mt-2">{confirmations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">확인 완료</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{confirmedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">자동 확인</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{autoConfirmedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">대기 중</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 확인 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            근무표 확인 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {confirmations.map((conf) => (
              <div
                key={conf.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* 상태 아이콘 */}
                    <div className="mt-1">{getStatusIcon(conf.status)}</div>

                    {/* 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{conf.nurseName}</h3>
                        {getStatusBadge(conf.status, conf.daysUntilDeadline)}
                        {conf.daysUntilDeadline <= 1 && conf.status === "pending" && (
                          <span className="text-xs text-red-600 font-semibold">
                            D-{conf.daysUntilDeadline}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{conf.month}</p>

                      {/* 근무 통계 */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-600">총 근무</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {conf.totalShifts}일
                          </p>
                        </div>
                        <div className="bg-orange-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-600">일근</p>
                          <p className="text-lg font-semibold text-orange-600">
                            {conf.dayShifts}일
                          </p>
                        </div>
                        <div className="bg-purple-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-600">저녁</p>
                          <p className="text-lg font-semibold text-purple-600">
                            {conf.eveningShifts}일
                          </p>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded text-center">
                          <p className="text-xs text-gray-600">야간</p>
                          <p className="text-lg font-semibold text-indigo-600">
                            {conf.nightShifts}일
                          </p>
                        </div>
                      </div>

                      {/* 확인 정보 */}
                      {conf.status === "confirmed" && (
                        <p className="text-xs text-green-600">
                          ✓ {conf.confirmedAt}에 확인됨
                        </p>
                      )}
                      {conf.status === "auto_confirmed" && (
                        <p className="text-xs text-blue-600">
                          🔄 {conf.confirmedAt}에 자동 확인됨
                        </p>
                      )}
                      {conf.status === "pending" && (
                        <p className="text-xs text-red-600">
                          ⏰ 확인 기한: {conf.deadline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {conf.status === "pending" && (
                    <Button
                      onClick={() => handleConfirm(conf.id)}
                      className="ml-4 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      확인
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 안내 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">근무표 확인 안내</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            • <strong>근무표 확인:</strong> 생성된 근무표를 검토하고 문제가 없으면 "확인" 버튼을
            클릭하세요
          </p>
          <p>
            • <strong>D-day 알림:</strong> 확인 기한이 지나면 자동으로 확인 처리됩니다
          </p>
          <p>
            • <strong>자동 확인:</strong> 모든 간호사가 확인하거나 D-day가 지나면 수간호사가
            최종 배포할 수 있습니다
          </p>
          <p>
            • <strong>수정 요청:</strong> 문제가 있으면 관리자에게 연락하여 수정을 요청하세요
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
