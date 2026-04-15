import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, Users, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const shiftSwapSchema = z.object({
  myDate: z.string().min(1, "내 근무 날짜를 선택해주세요"),
  myShift: z.enum(["day", "evening", "night"]).default("day"),
  targetNurse: z.string().min(1, "교환 대상 간호사를 선택해주세요"),
  targetDate: z.string().min(1, "상대방 근무 날짜를 선택해주세요"),
  targetShift: z.enum(["day", "evening", "night"]).default("day"),
  reason: z.string().optional(),
});

type ShiftSwapForm = z.infer<typeof shiftSwapSchema>;

const mockNurses = [
  { id: 1, name: "김영희" },
  { id: 2, name: "이순신" },
  { id: 3, name: "박민준" },
  { id: 4, name: "정수현" },
  { id: 5, name: "최민지" },
];

// 각 간호사의 불가능 날짜
const unavailableDates: Record<number, string[]> = {
  1: ["2026-04-05", "2026-04-06", "2026-04-12"],
  2: ["2026-04-08", "2026-04-15"],
  3: ["2026-04-10", "2026-04-20", "2026-04-25"],
  4: ["2026-04-03", "2026-04-18"],
  5: ["2026-04-07", "2026-04-14", "2026-04-21"],
};

// 현재 사용자의 불가능 날짜 (로그인한 사용자 기준)
const currentUserUnavailableDates = ["2026-04-05", "2026-04-06", "2026-04-12"];

const shiftLabels = {
  day: "일근",
  evening: "저녁",
  night: "야간",
};

export default function ShiftSwapPage() {
  const [requests, setRequests] = useState([
    {
      id: 1,
      myDate: "2026-04-10",
      myShift: "day",
      targetNurse: "김영희",
      targetDate: "2026-04-12",
      targetShift: "evening",
      status: "pending",
      submittedAt: "2026-04-01",
      notificationSent: true,
      notificationMethod: "email",
    },
    {
      id: 2,
      myDate: "2026-04-15",
      myShift: "night",
      targetNurse: "이순신",
      targetDate: "2026-04-18",
      targetShift: "night",
      status: "approved",
      submittedAt: "2026-03-28",
      notificationSent: true,
      notificationMethod: "email",
      approvedAt: "2026-04-02",
    },
    {
      id: 3,
      myDate: "2026-04-20",
      myShift: "evening",
      targetNurse: "박민준",
      targetDate: "2026-04-22",
      targetShift: "day",
      status: "rejected",
      submittedAt: "2026-03-25",
      rejectionReason: "상대방이 거절함",
      notificationSent: true,
      notificationMethod: "sms",
    },
  ]);

  const form = useForm<ShiftSwapForm>({
    resolver: zodResolver(shiftSwapSchema) as any,
    defaultValues: {
      myDate: "",
      myShift: "day",
      targetNurse: "",
      targetDate: "",
      targetShift: "day",
      reason: "",
    },
  });

  const onSubmit = (data: any) => {
    const newRequest = {
      id: requests.length + 1,
      myDate: data.myDate,
      myShift: data.myShift,
      targetNurse: mockNurses.find((n) => n.id.toString() === data.targetNurse)?.name || "",
      targetDate: data.targetDate,
      targetShift: data.targetShift,
      status: "pending",
      submittedAt: new Date().toISOString().split("T")[0],
      notificationSent: true,
      notificationMethod: "email",
      reason: data.reason,
    };
    setRequests([...requests, newRequest]);
    form.reset();
  };

  const handleDeleteRequest = (id: number) => {
    if (confirm("이 요청을 취소하시겠습니까?")) {
      setRequests(requests.filter((r) => r.id !== id));
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    pending: "대기 중",
    approved: "승인됨",
    rejected: "거절됨",
  };

  const notificationMethodLabels = {
    email: "📧 이메일",
    sms: "📱 SMS",
  };

  // 선택된 대상 간호사의 불가능 날짜 가져오기
  const selectedTargetNurseId = form.watch("targetNurse");
  const targetNurseUnavailableDates = selectedTargetNurseId
    ? unavailableDates[parseInt(selectedTargetNurseId)] || []
    : [];

  const isDateDisabled = (date: string, isTarget: boolean) => {
    if (isTarget) {
      return targetNurseUnavailableDates.includes(date);
    } else {
      return currentUserUnavailableDates.includes(date);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">근무 교환</h1>
            <p className="text-muted-foreground mt-2">
              다른 간호사와 근무를 교환합니다
            </p>
          </div>
        </div>

        {/* 불가능 날짜 안내 */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>불가능 날짜:</strong> 회색으로 표시된 날짜는 선택할 수 없습니다.
            불가능 날짜를 변경하려면 오프 신청 페이지에서 수정하세요.
          </AlertDescription>
        </Alert>

        {/* New Swap Request Form */}
        <Card>
          <CardHeader>
            <CardTitle>새 교환 요청</CardTitle>
            <CardDescription>
              교환하고 싶은 근무를 선택해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* 내 근무 정보 */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-4">내 근무</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="myDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>내 근무 날짜</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              style={{
                                opacity: isDateDisabled(field.value, false) ? 0.5 : 1,
                              }}
                            />
                          </FormControl>
                          {isDateDisabled(field.value, false) && (
                            <p className="text-xs text-red-600">
                              ⚠️ 이 날짜는 불가능한 날짜입니다
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="myShift"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>내 근무 유형</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="day">일근</SelectItem>
                              <SelectItem value="evening">저녁</SelectItem>
                              <SelectItem value="night">야간</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 상대방 근무 정보 */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-4">교환 대상 간호사</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetNurse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>간호사 선택</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="간호사를 선택해주세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mockNurses.map((nurse) => (
                                <SelectItem key={nurse.id} value={nurse.id.toString()}>
                                  {nurse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-end">
                      {selectedTargetNurseId && targetNurseUnavailableDates.length > 0 && (
                        <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded w-full">
                          <p className="font-semibold mb-1">불가능 날짜:</p>
                          <p>{targetNurseUnavailableDates.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="targetDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>상대방 근무 날짜</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              disabled={!selectedTargetNurseId}
                              style={{
                                opacity: isDateDisabled(field.value, true) ? 0.5 : 1,
                              }}
                            />
                          </FormControl>
                          {!selectedTargetNurseId && (
                            <p className="text-xs text-gray-600">
                              먼저 간호사를 선택해주세요
                            </p>
                          )}
                          {isDateDisabled(field.value, true) && (
                            <p className="text-xs text-red-600">
                              ⚠️ 이 날짜는 상대방의 불가능 날짜입니다
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetShift"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>상대방 근무 유형</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="day">일근</SelectItem>
                              <SelectItem value="evening">저녁</SelectItem>
                              <SelectItem value="night">야간</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 사유 */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>교환 사유 (선택)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="교환 사유를 입력해주세요"
                          {...field}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormDescription>
                        상대방이 요청을 더 쉽게 이해할 수 있도록 사유를 작성해주세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 알림 설정 */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📧 알림 설정</p>
                  <p className="text-sm text-blue-800">
                    요청 제출 시 상대방에게 이메일로 자동 알림이 발송됩니다.
                    상대방이 승인/거절하면 SMS로도 알림을 받습니다.
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  교환 요청 제출
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 교환 요청 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              교환 요청 현황
            </CardTitle>
            <CardDescription>
              {pendingCount}개 대기 중 · {approvedCount}개 승인됨
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">교환 요청이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request: any) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {request.status === "pending" && (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                        {request.status === "approved" && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                        {request.status === "rejected" && (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <h4 className="font-semibold">
                            {shiftLabels[request.myShift as keyof typeof shiftLabels]} (
                            {request.myDate}) ↔ {request.targetNurse}{" "}
                            {shiftLabels[request.targetShift as keyof typeof shiftLabels]} (
                            {request.targetDate})
                          </h4>
                          <p className="text-sm text-gray-600">
                            요청일: {request.submittedAt}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                        {statusLabels[request.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>

                    {/* 알림 상태 */}
                    {request.notificationSent && (
                      <div className="mb-3 text-xs text-gray-600 flex items-center gap-2">
                        <span className="inline-block">
                          {notificationMethodLabels[request.notificationMethod as keyof typeof notificationMethodLabels]}
                          로 알림 발송됨
                        </span>
                      </div>
                    )}

                    {request.reason && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                        <p className="text-gray-700">
                          <strong>사유:</strong> {request.reason}
                        </p>
                      </div>
                    )}

                    {request.status === "rejected" && request.rejectionReason && (
                      <div className="mb-3 p-2 bg-red-50 rounded text-sm">
                        <p className="text-red-700">
                          <strong>거절 사유:</strong> {request.rejectionReason}
                        </p>
                      </div>
                    )}

                    {request.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRequest(request.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        요청 취소
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">근무 교환 안내</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-800 space-y-2">
            <p>
              • <strong>불가능 날짜:</strong> 회색으로 표시된 날짜는 선택할 수 없습니다
            </p>
            <p>
              • <strong>알림 발송:</strong> 요청 제출 시 상대방에게 이메일로 알림이 발송됩니다
            </p>
            <p>
              • <strong>승인/거절:</strong> 상대방이 승인하면 근무표에 반영되고 SMS로 알림을 받습니다
            </p>
            <p>
              • <strong>요청 취소:</strong> 대기 중인 요청은 언제든지 취소할 수 있습니다
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
