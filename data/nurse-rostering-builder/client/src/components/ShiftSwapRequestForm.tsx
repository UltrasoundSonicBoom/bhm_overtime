import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ShiftSwapRequestFormProps {
  scheduleId: number;
  nurses: Array<{ id: number; name: string }>;
  onSuccess?: () => void;
}

export function ShiftSwapRequestForm({ scheduleId, nurses, onSuccess }: ShiftSwapRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [targetNurseId, setTargetNurseId] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSwapRequest = trpc.shiftSwapRequest.create.useMutation({
    onSuccess: () => {
      toast.success("근무 교환 요청이 완료되었습니다.");
      setTargetNurseId("");
      setRequestedDate("");
      setTargetDate("");
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

    if (!targetNurseId || !requestedDate || !targetDate) {
      toast.error("모든 필수 항목을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createSwapRequest.mutateAsync({
        scheduleId,
        targetNurseId: parseInt(targetNurseId),
        requestedDate,
        targetDate,
        reason: reason || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          근무 교환 요청
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>근무 교환 요청</DialogTitle>
          <DialogDescription>
            동료와 근무를 교환하고 싶으신 경우 요청해주세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nurse">교환 대상 간호사 *</Label>
            <Select value={targetNurseId} onValueChange={setTargetNurseId}>
              <SelectTrigger id="nurse" disabled={isSubmitting}>
                <SelectValue placeholder="간호사를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((nurse) => (
                  <SelectItem key={nurse.id} value={nurse.id.toString()}>
                    {nurse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="my-date">내 근무 날짜 *</Label>
              <Input
                id="my-date"
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-date">교환 대상 근무 날짜 *</Label>
              <Input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">사유</Label>
            <Textarea
              id="reason"
              placeholder="교환 사유를 입력해주세요."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="flex gap-2 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg text-sm text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              근무 교환 요청은 상대방의 승인이 필요합니다. 상대방이 거절할 수 있으니 사전에 협의하시기 바랍니다.
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
              {isSubmitting ? "요청 중..." : "요청하기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
