import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRightLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface Nurse {
  id: number;
  name: string;
}

interface ShiftAssignment {
  id: number;
  nurseId: number;
  date: string;
  shiftType: string;
}

interface ShiftSwapDialogProps {
  nurses: Nurse[];
  assignments: ShiftAssignment[];
  onSwap: (nurse1Id: number, nurse2Id: number, date: string) => Promise<void>;
}

export default function ShiftSwapDialog({
  nurses,
  assignments,
  onSwap,
}: ShiftSwapDialogProps) {
  const [open, setOpen] = useState(false);
  const [nurse1Id, setNurse1Id] = useState<string>("");
  const [nurse2Id, setNurse2Id] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const nurse1 = nurses.find((n) => n.id === Number(nurse1Id));
  const nurse2 = nurses.find((n) => n.id === Number(nurse2Id));

  const nurse1Shift = assignments.find(
    (a) => a.nurseId === Number(nurse1Id) && a.date === date
  );
  const nurse2Shift = assignments.find(
    (a) => a.nurseId === Number(nurse2Id) && a.date === date
  );

  const handleSwap = async () => {
    if (!nurse1Id || !nurse2Id || !date) {
      toast.error("모든 필드를 선택해주세요");
      return;
    }

    if (nurse1Id === nurse2Id) {
      toast.error("다른 간호사를 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      await onSwap(Number(nurse1Id), Number(nurse2Id), date);
      toast.success("근무가 교환되었습니다");
      setOpen(false);
      setNurse1Id("");
      setNurse2Id("");
      setDate("");
    } catch (error) {
      toast.error("근무 교환에 실패했습니다");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique dates from assignments
  const uniqueDates = Array.from(new Set(assignments.map((a) => a.date))).sort();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          근무 교환
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>근무 교환</DialogTitle>
          <DialogDescription>
            두 간호사의 근무를 교환합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">날짜</Label>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger id="date">
                <SelectValue placeholder="날짜 선택" />
              </SelectTrigger>
              <SelectContent>
                {uniqueDates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {new Date(d).toLocaleDateString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nurse 1 Selection */}
          <div className="space-y-2">
            <Label htmlFor="nurse1">간호사 1</Label>
            <Select value={nurse1Id} onValueChange={setNurse1Id}>
              <SelectTrigger id="nurse1">
                <SelectValue placeholder="간호사 선택" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((nurse) => (
                  <SelectItem key={nurse.id} value={String(nurse.id)}>
                    {nurse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nurse1Shift && (
              <p className="text-sm text-muted-foreground">
                현재 근무: {nurse1Shift.shiftType}
              </p>
            )}
          </div>

          {/* Nurse 2 Selection */}
          <div className="space-y-2">
            <Label htmlFor="nurse2">간호사 2</Label>
            <Select value={nurse2Id} onValueChange={setNurse2Id}>
              <SelectTrigger id="nurse2">
                <SelectValue placeholder="간호사 선택" />
              </SelectTrigger>
              <SelectContent>
                {nurses.map((nurse) => (
                  <SelectItem key={nurse.id} value={String(nurse.id)}>
                    {nurse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nurse2Shift && (
              <p className="text-sm text-muted-foreground">
                현재 근무: {nurse2Shift.shiftType}
              </p>
            )}
          </div>

          {/* Swap Preview */}
          {nurse1Shift && nurse2Shift && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm">
                  <p>
                    {nurse1?.name} ({nurse1Shift.shiftType}) ↔{" "}
                    {nurse2?.name} ({nurse2Shift.shiftType})
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button onClick={handleSwap} disabled={loading || !nurse1Id || !nurse2Id || !date}>
              {loading ? "교환 중..." : "교환"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
