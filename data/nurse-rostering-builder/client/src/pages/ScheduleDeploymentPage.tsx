import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle2,
  Send,
  Download,
  Eye,
  Calendar,
  Users,
} from "lucide-react";

interface DeploymentRecord {
  id: number;
  month: string;
  status: "draft" | "pending_confirmation" | "confirmed" | "deployed" | "archived";
  totalNurses: number;
  confirmedNurses: number;
  autoConfirmedNurses: number;
  deployedAt?: string;
  deployDeadline: string;
  createdAt: string;
  createdBy: string;
}

const mockDeployments: DeploymentRecord[] = [
  {
    id: 1,
    month: "2026년 4월",
    status: "pending_confirmation",
    totalNurses: 10,
    confirmedNurses: 8,
    autoConfirmedNurses: 0,
    deployDeadline: "2026-04-05",
    createdAt: "2026-03-25",
    createdBy: "김관리자",
  },
  {
    id: 2,
    month: "2026년 3월",
    status: "deployed",
    totalNurses: 10,
    confirmedNurses: 10,
    autoConfirmedNurses: 0,
    deployedAt: "2026-03-01",
    deployDeadline: "2026-02-28",
    createdAt: "2026-02-20",
    createdBy: "김관리자",
  },
  {
    id: 3,
    month: "2026년 2월",
    status: "archived",
    totalNurses: 10,
    confirmedNurses: 10,
    autoConfirmedNurses: 0,
    deployedAt: "2026-02-01",
    deployDeadline: "2026-01-31",
    createdAt: "2026-01-20",
    createdBy: "김관리자",
  },
];

export default function ScheduleDeploymentPage() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>(mockDeployments);

  const handleDeploy = (id: number) => {
    if (confirm("근무표를 최종 배포하시겠습니까?")) {
      setDeployments(
        deployments.map((dep) =>
          dep.id === id
            ? {
                ...dep,
                status: "deployed",
                deployedAt: new Date().toISOString().split("T")[0],
              }
            : dep
        )
      );
    }
  };

  const handleArchive = (id: number) => {
    if (confirm("근무표를 보관하시겠습니까?")) {
      setDeployments(
        deployments.map((dep) =>
          dep.id === id
            ? {
                ...dep,
                status: "archived",
              }
            : dep
        )
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">초안</Badge>;
      case "pending_confirmation":
        return <Badge className="bg-yellow-500">확인 대기 중</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-500">확인 완료</Badge>;
      case "deployed":
        return <Badge className="bg-green-500">배포됨</Badge>;
      case "archived":
        return <Badge variant="outline" className="bg-gray-100">보관됨</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_confirmation":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "confirmed":
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      case "deployed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default:
        return null;
    }
  };

  const pendingCount = deployments.filter((d) => d.status === "pending_confirmation").length;
  const deployedCount = deployments.filter((d) => d.status === "deployed").length;

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">근무표 배포 관리</h1>
        <p className="text-gray-600 mt-2">생성된 근무표를 최종 배포합니다 (수간호사 전용)</p>
      </div>

      {/* 긴급 알림 */}
      {pendingCount > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{pendingCount}개의 근무표</strong>가 확인 대기 중입니다. 간호사 확인 현황을
            확인하고 배포하세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">총 근무표</p>
              <p className="text-3xl font-bold mt-2">{deployments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">배포 완료</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{deployedCount}</p>
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

      {/* 배포 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            근무표 배포 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deployments.map((dep) => {
              const confirmationRate = Math.round(
                ((dep.confirmedNurses + dep.autoConfirmedNurses) / dep.totalNurses) * 100
              );
              const isReadyToDeploy =
                dep.status === "pending_confirmation" &&
                confirmationRate === 100;

              return (
                <div
                  key={dep.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(dep.status)}
                      <div>
                        <h3 className="font-semibold text-lg">{dep.month}</h3>
                        <p className="text-sm text-gray-600">
                          생성: {dep.createdAt} | 생성자: {dep.createdBy}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(dep.status)}
                  </div>

                  {/* 확인 진행률 */}
                  {dep.status === "pending_confirmation" && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">간호사 확인 현황</span>
                        <span className="text-sm font-semibold">
                          {dep.confirmedNurses + dep.autoConfirmedNurses}/{dep.totalNurses}
                        </span>
                      </div>
                      <Progress
                        value={confirmationRate}
                        className="h-2"
                      />
                      <div className="flex gap-4 mt-2 text-xs text-gray-600">
                        <span>✓ 수동 확인: {dep.confirmedNurses}명</span>
                        <span>🔄 자동 확인: {dep.autoConfirmedNurses}명</span>
                        <span>⏳ 대기: {dep.totalNurses - dep.confirmedNurses - dep.autoConfirmedNurses}명</span>
                      </div>
                    </div>
                  )}

                  {/* 배포 정보 */}
                  {dep.status === "deployed" && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800">
                        ✓ {dep.deployedAt}에 배포됨
                      </p>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="w-4 h-4" />
                      상세보기
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      다운로드
                    </Button>

                    {dep.status === "pending_confirmation" && (
                      <>
                        {isReadyToDeploy ? (
                          <Button
                            onClick={() => handleDeploy(dep.id)}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <Send className="w-4 h-4" />
                            배포
                          </Button>
                        ) : (
                          <Button
                            disabled
                            className="gap-2"
                            title="모든 간호사의 확인이 필요합니다"
                          >
                            <Send className="w-4 h-4" />
                            배포 (대기 중)
                          </Button>
                        )}
                      </>
                    )}

                    {dep.status === "deployed" && (
                      <Button
                        onClick={() => handleArchive(dep.id)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        보관
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 배포 프로세스 안내 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">배포 프로세스</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-3">
          <div className="flex gap-3">
            <span className="font-bold min-w-fit">1단계:</span>
            <span>AI 알고리즘이 최적화된 근무표 초안 생성</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-fit">2단계:</span>
            <span>각 간호사가 자신의 근무표 확인 및 승인</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-fit">3단계:</span>
            <span>D-day 경과 시 자동 확인 처리</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-fit">4단계:</span>
            <span>모든 간호사 확인 후 수간호사가 최종 배포</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-fit">5단계:</span>
            <span>배포된 근무표는 모든 간호사에게 공지</span>
          </div>
        </CardContent>
      </Card>

      {/* 주의사항 */}
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-900">주의사항</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-red-800 space-y-2">
          <p>• 배포 후에는 근무표를 수정할 수 없습니다</p>
          <p>• 긴급한 변경이 필요하면 관리자에게 문의하세요</p>
          <p>• 배포된 근무표는 모든 간호사에게 자동으로 공지됩니다</p>
          <p>• 배포 이력은 보관 상태에서도 조회 가능합니다</p>
        </CardContent>
      </Card>
    </div>
  );
}
