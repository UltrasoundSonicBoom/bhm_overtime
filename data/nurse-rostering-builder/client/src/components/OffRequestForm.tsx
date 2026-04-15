import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface OffRequestFormProps {
  scheduleId: number;
  onSuccess?: () => void;
}

export function OffRequestForm({ scheduleId, onSuccess }: OffRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOffRequest = trpc.offRequest.create.useMutation({
    onSuccess: () => {
      toast.success("오프 신청이 완료되었습니다.");
      setRequestedDate("");
      setReason("");
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`오류: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestedDate) {
      toast.error("날짜를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createOffRequest.mutateAsync({
        scheduleId,
        requestedDate,
        reason: reason || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Calendar className="w-4 h-4" />
          오프 신청
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>오프 신청</DialogTitle>
          <DialogDescription>
            휴무를 원하는 날짜를 선택하고 사유를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">날짜 *</Label>
            <Input
              id="date"
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              placeholder="개인 사정, 의료 약속 등 사유를 입력해주세요."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="flex gap-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              오프 신청은 수간호사의 승인이 필요합니다. 신청 후 24시간 이내에 결과를 통보받으실 수 있습니다.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "신청 중..." : "신청하기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
