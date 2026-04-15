import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Request {
  id: number;
  type: "off" | "swap";
  nurseName: string;
  requestedDate: string;
  targetDate?: string;
  targetNurseName?: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface RequestManagementProps {
  requests: Request[];
  onRefresh?: () => void;
}

export function RequestManagement({ requests, onRefresh }: RequestManagementProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const approveOffRequest = trpc.offRequest.approve.useMutation({
    onSuccess: () => {
      toast.success("오프 신청을 승인했습니다.");
      setSelectedRequest(null);
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(`오류: ${error.message}`);
    },
  });

  const rejectOffRequest = trpc.offRequest.reject.useMutation({
    onSuccess: () => {
      toast.success("오프 신청을 거절했습니다.");
      setSelectedRequest(null);
      setRejectReason("");
      onRefresh?.();
    },
    onError: (error) => {
      toast.error(`오류: ${error.message}`);
    },
  });

  const handleApprove = async (requestId: number) => {
    setIsProcessing(true);
    try {
      if (selectedRequest?.type === "off") {
        await approveOffRequest.mutateAsync({ requestId });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    setIsProcessing(true);
    try {
      if (selectedRequest?.type === "off") {
        await rejectOffRequest.mutateAsync({ requestId });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">승인됨</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">거절됨</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">대기 중</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    return type === "off" ? "오프 신청" : "근무 교환";
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            대기 중인 요청 ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            승인 또는 거절이 필요한 요청입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>대기 중인 요청이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{request.nurseName}</span>
                      <Badge variant="outline">{getRequestTypeLabel(request.type)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.type === "off"
                        ? `${request.requestedDate} 오프 신청`
                        : `${request.requestedDate} ↔ ${request.targetDate} (${request.targetNurseName})`}
                    </p>
                    {request.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        사유: {request.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(request.id)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setSelectedRequest(request)}
                      disabled={isProcessing}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      거절
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>처리 완료된 요청</CardTitle>
            <CardDescription>
              승인 또는 거절된 요청의 이력입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <span className="font-medium">{request.nurseName}</span>
                    <span className="text-muted-foreground ml-2">
                      {request.type === "off"
                        ? `${request.requestedDate} 오프`
                        : `근무 교환`}
                    </span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>요청 거절</DialogTitle>
            <DialogDescription>
              {selectedRequest?.nurseName}의 {getRequestTypeLabel(selectedRequest?.type || "off")} 요청을 거절하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">거절 사유 (선택사항)</Label>
              <Textarea
                id="reject-reason"
                placeholder="거절 사유를 입력해주세요."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                disabled={isProcessing}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRequest && handleReject(selectedRequest.id)}
                disabled={isProcessing}
              >
                {isProcessing ? "처리 중..." : "거절하기"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
