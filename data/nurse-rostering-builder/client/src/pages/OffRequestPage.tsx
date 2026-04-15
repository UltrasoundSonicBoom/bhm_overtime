import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, Calendar } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

const offRequestSchema = z.object({
  date: z.string().min(1, "날짜를 선택해주세요"),
  reason: z.string().min(1, "사유를 입력해주세요").max(500),
});

type OffRequestForm = z.infer<typeof offRequestSchema>;

export default function OffRequestPage() {
  const [requests, setRequests] = useState([
    {
      id: 1,
      date: "2026-04-10",
      reason: "개인 사유",
      status: "pending",
      submittedAt: "2026-04-01",
    },
    {
      id: 2,
      date: "2026-04-15",
      reason: "병원 방문",
      status: "approved",
      submittedAt: "2026-03-28",
    },
    {
      id: 3,
      date: "2026-04-20",
      reason: "가족 행사",
      status: "rejected",
      submittedAt: "2026-03-25",
      rejectionReason: "이미 다른 간호사가 오프 신청함",
    },
  ]);

  const form = useForm<OffRequestForm>({
    resolver: zodResolver(offRequestSchema),
    defaultValues: {
      date: "",
      reason: "",
    },
  });

  const onSubmit = (data: OffRequestForm) => {
    const newRequest = {
      id: requests.length + 1,
      date: data.date,
      reason: data.reason,
      status: "pending",
      submittedAt: new Date().toISOString().split("T")[0],
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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">오프 신청</h1>
            <p className="text-muted-foreground mt-2">
              근무 불가능한 날짜를 신청합니다
            </p>
          </div>
        </div>

        {/* New Request Form */}
        <Card>
          <CardHeader>
            <CardTitle>새 오프 신청</CardTitle>
            <CardDescription>
              근무할 수 없는 날짜를 신청해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>날짜</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="w-full md:w-64"
                        />
                      </FormControl>
                      <FormDescription>
                        오프를 신청할 날짜를 선택하세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사유</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="오프 신청 사유를 입력하세요"
                          className="min-h-24"
                        />
                      </FormControl>
                      <FormDescription>
                        최대 500자까지 입력 가능합니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="gap-2">
                  <Plus className="w-4 h-4" />
                  신청하기
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Request History */}
        <Card>
          <CardHeader>
            <CardTitle>신청 이력</CardTitle>
            <CardDescription>
              제출한 오프 신청 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">신청한 오프가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-sm font-medium">{request.date}</div>
                        <Badge
                          className={
                            statusColors[request.status as keyof typeof statusColors]
                          }
                        >
                          {statusLabels[request.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground mb-2">
                        {request.reason}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>신청일: {request.submittedAt}</span>
                        {request.rejectionReason && (
                          <span className="text-red-600">
                            거절 사유: {request.rejectionReason}
                          </span>
                        )}
                      </div>
                    </div>
                    {request.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRequest(request.id)}
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">오프 신청 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              • 오프 신청은 근무 예정일로부터 최소 7일 전에 신청해주세요
            </p>
            <p>
              • 긴급한 사유의 경우 수간호사에게 직접 연락해주세요
            </p>
            <p>
              • 신청 후 3일 이내에 승인 또는 거절 결과를 받게 됩니다
            </p>
            <p>
              • 거절된 신청은 다시 수정하여 재신청할 수 있습니다
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
