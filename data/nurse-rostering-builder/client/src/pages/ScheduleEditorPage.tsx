import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { EditableScheduleBuilder } from "@/components/EditableScheduleBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ScheduleData {
  scheduleId: number;
  wardId: number;
  wardName: string;
  year: number;
  month: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  publishedAt?: string;
}

interface ScheduleCell {
  nurseId: number;
  date: number;
  shift: "day" | "evening" | "night" | "off";
}

export default function ScheduleEditorPage() {
  const { user, isAuthenticated } = useAuth();
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleData | null>(null);
  const [schedules, setSchedules] = useState<ScheduleData[]>([
    {
      scheduleId: 1,
      wardId: 1,
      wardName: "내과",
      year: 2026,
      month: 4,
      status: "draft",
      createdAt: "2026-04-13",
    },
    {
      scheduleId: 2,
      wardId: 2,
      wardName: "외과",
      year: 2026,
      month: 4,
      status: "published",
      createdAt: "2026-04-10",
      publishedAt: "2026-04-12",
    },
  ]);

  // Mock nurses
  const nurses = [
    { id: 1, name: "김영희" },
    { id: 2, name: "이순신" },
    { id: 3, name: "박민준" },
    { id: 4, name: "정수현" },
  ];

  // Mock initial schedule
  const mockSchedule: ScheduleCell[] = Array.from({ length: 30 }, (_, i) => ({
    nurseId: ((i + 1) % 4) + 1,
    date: i + 1,
    shift: (
      Math.random() < 0.3
        ? "day"
        : Math.random() < 0.6
          ? "evening"
          : Math.random() < 0.85
            ? "night"
            : "off"
    ) as any,
  }));

  const handleSaveSchedule = async (schedule: ScheduleCell[]) => {
    if (!selectedSchedule) return;

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update schedule status
      setSchedules((prev) =>
        prev.map((s) =>
          s.scheduleId === selectedSchedule.scheduleId
            ? { ...s, status: "draft" as const }
            : s
        )
      );

      toast.success("근무표가 저장되었습니다");
    } catch (error) {
      console.error("Failed to save schedule:", error);
      throw error;
    }
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              이 페이지는 관리자만 접근할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">근무표 편집</h1>
          <p className="text-muted-foreground mt-1">AI 생성 근무표를 수동으로 편집하고 저장합니다</p>
        </div>

        {/* Schedule List and Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Schedule List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">근무표 목록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {schedules.map((schedule) => (
                  <button
                    key={schedule.scheduleId}
                    onClick={() => setSelectedSchedule(schedule)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSchedule?.scheduleId === schedule.scheduleId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{schedule.wardName}</div>
                    <div className="text-xs text-muted-foreground">
                      {schedule.year}년 {schedule.month}월
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {schedule.status === "draft" && (
                        <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                          작성 중
                        </span>
                      )}
                      {schedule.status === "published" && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                          확정됨
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            {selectedSchedule ? (
              <div className="space-y-4">
                {/* Info Alert */}
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{selectedSchedule.wardName}</strong> 병동의{" "}
                    <strong>
                      {selectedSchedule.year}년 {selectedSchedule.month}월
                    </strong>{" "}
                    근무표를 편집하고 있습니다.
                  </AlertDescription>
                </Alert>

                {/* Editing Tips */}
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      편집 방법
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 text-blue-900 dark:text-blue-100">
                    <p>• <strong>셀 클릭</strong>: 근무 유형을 선택하여 변경</p>
                    <p>• <strong>드래그 앤 드롭</strong>: 두 근무를 교환</p>
                    <p>• <strong>저장</strong>: 변경 사항을 데이터베이스에 저장</p>
                    <p>• <strong>취소</strong>: 변경 사항을 원래대로 되돌림</p>
                  </CardContent>
                </Card>

                {/* Editor Component */}
                <EditableScheduleBuilder
                  scheduleId={selectedSchedule.scheduleId}
                  nurses={nurses}
                  year={selectedSchedule.year}
                  month={selectedSchedule.month}
                  initialSchedule={mockSchedule}
                  onSave={handleSaveSchedule}
                />

                {/* Constraint Validation Tips */}
                <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      제약 조건 확인
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 text-amber-900 dark:text-amber-100">
                    <p>✓ 최소 11시간 휴식 보장</p>
                    <p>✓ 연속 야간근무 3회 제한</p>
                    <p>✓ 최소 2일 연속 휴무</p>
                    <p>✓ 주말 공정한 배분</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <p className="text-muted-foreground">편집할 근무표를 선택하세요</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
