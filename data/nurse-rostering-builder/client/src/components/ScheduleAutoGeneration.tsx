import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ScheduleAutoGenerationProps {
  scheduleId: number;
  wardId: number;
  onGenerated?: () => void;
}

interface GenerationStatus {
  stage: "idle" | "generating" | "validating" | "complete" | "error";
  progress: number;
  message: string;
  violations?: Array<{
    type: string;
    severity: "hard" | "soft";
    count: number;
  }>;
}

export function ScheduleAutoGeneration({
  scheduleId,
  wardId,
  onGenerated,
}: ScheduleAutoGenerationProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>({
    stage: "idle",
    progress: 0,
    message: "준비 중...",
  });

  const generateScheduleMutation = trpc.schedule.autoGenerate.useMutation();

  async function handleAutoGenerate() {
    try {
      setStatus({
        stage: "generating",
        progress: 30,
        message: "스케줄 생성 중...",
      });

      const result = await generateScheduleMutation.mutateAsync({
        scheduleId,
        wardId,
      });

      setStatus({
        stage: "validating",
        progress: 70,
        message: "제약 조건 검증 중...",
      });

      // Simulate validation delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (result.success) {
        setStatus({
          stage: "complete",
          progress: 100,
          message: "스케줄 생성 완료!",
          violations: result.violations,
        });

        toast.success("AI 자동 스케줄링이 완료되었습니다");

        // Close dialog after 2 seconds
        setTimeout(() => {
          setOpen(false);
          if (onGenerated) {
            onGenerated();
          }
        }, 2000);
      } else {
        setStatus({
          stage: "error",
          progress: 100,
          message: result.message || "스케줄 생성에 실패했습니다",
          violations: result.violations,
        });

        toast.error("스케줄 생성에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to generate schedule:", error);
      setStatus({
        stage: "error",
        progress: 100,
        message: "오류가 발생했습니다",
      });

      toast.error("스케줄 생성 중 오류가 발생했습니다");
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="gap-2"
        onClick={() => {
          setStatus({ stage: "idle", progress: 0, message: "준비 중..." });
          setOpen(true);
        }}
        disabled={generateScheduleMutation.isPending}
      >
        {generateScheduleMutation.isPending && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!generateScheduleMutation.isPending && <Zap className="w-4 h-4" />}
        AI 자동 배정
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI 자동 스케줄링</DialogTitle>
            <DialogDescription>
              한국 병원 근무 규칙에 기반한 최적 근무표를 자동 생성합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">진행 상황</span>
                <span className="text-sm text-muted-foreground">{status.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{status.message}</p>
            </div>

            {/* Status Card */}
            {status.stage === "complete" && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-5 h-5" />
                    생성 완료
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    최적 근무표가 생성되었습니다. 근무 규칙을 준수하며 공정성을 최대화했습니다.
                  </p>
                </CardContent>
              </Card>
            )}

            {status.stage === "error" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}

            {/* Violations Summary */}
            {status.violations && status.violations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">제약 조건 검증 결과</h4>
                <div className="space-y-2">
                  {status.violations.map((violation, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-sm ${
                        violation.severity === "hard"
                          ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                      }`}
                    >
                      <div className="font-medium">
                        {violation.severity === "hard" ? "⚠️ 필수 규칙" : "ℹ️ 권장 규칙"}
                      </div>
                      <div className="text-xs mt-1">
                        {violation.type}: {violation.count}건
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Algorithm Info */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">적용 알고리즘</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <strong>제약 조건:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>최소 11시간 휴식 보장</li>
                    <li>연속 야간근무 3회 제한</li>
                    <li>최소 2일 연속 휴무</li>
                    <li>주말 공정한 배분</li>
                  </ul>
                </div>
                <div>
                  <strong>최적화:</strong> 모의 담금질 알고리즘 (1000회 반복)
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={status.stage === "generating" || status.stage === "validating"}
              >
                {status.stage === "complete" ? "닫기" : "취소"}
              </Button>
              {status.stage === "idle" && (
                <Button onClick={handleAutoGenerate} disabled={generateScheduleMutation.isPending}>
                  {generateScheduleMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  스케줄 생성 시작
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
