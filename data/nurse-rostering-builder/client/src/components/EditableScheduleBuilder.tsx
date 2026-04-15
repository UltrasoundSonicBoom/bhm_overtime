import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Save, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { validateSchedule } from "@/lib/constraintValidator";
import { ConstraintAlerts } from "./ConstraintAlerts";

interface ScheduleCell {
  nurseId: number;
  date: number;
  shift: "day" | "evening" | "night" | "off";
}

interface EditableScheduleBuilderProps {
  scheduleId: number;
  nurses: Array<{ id: number; name: string }>;
  year?: number;
  month?: number;
  initialSchedule?: ScheduleCell[];
  onSave?: (schedule: ScheduleCell[]) => Promise<void>;
}

const SHIFT_TYPES = {
  day: { label: "주간", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", abbr: "D" },
  evening: { label: "저녁", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", abbr: "E" },
  night: { label: "야간", color: "bg-slate-700 text-slate-100 dark:bg-slate-600 dark:text-slate-200", abbr: "N" },
  off: { label: "휴무", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", abbr: "O" },
};

const SHIFT_ORDER: Array<"day" | "evening" | "night" | "off"> = ["day", "evening", "night", "off"];

export function EditableScheduleBuilder({
  scheduleId,
  nurses,
  year = 2026,
  month = 4,
  initialSchedule = [],
  onSave,
}: EditableScheduleBuilderProps) {
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);
  const [schedule, setSchedule] = useState<ScheduleCell[]>(initialSchedule);
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleCell[]>(initialSchedule);
  const [selectedCell, setSelectedCell] = useState<{ nurseId: number; date: number } | null>(null);
  const [draggedCell, setDraggedCell] = useState<ScheduleCell | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [validationResult, setValidationResult] = useState(() => validateSchedule(initialSchedule, 30));

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const getShift = useCallback(
    (nurseId: number, date: number): "day" | "evening" | "night" | "off" => {
      const cell = schedule.find((c) => c.nurseId === nurseId && c.date === date);
      return cell?.shift || "off";
    },
    [schedule]
  );

  const hasChanges = useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(originalSchedule);
  }, [schedule, originalSchedule]);

  const handleShiftChange = (nurseId: number, date: number, newShift: string) => {
    setSchedule((prev) => {
      const existing = prev.find((c) => c.nurseId === nurseId && c.date === date);
      if (existing) {
        return prev.map((c) =>
          c.nurseId === nurseId && c.date === date ? { ...c, shift: newShift as any } : c
        );
      } else {
        return [...prev, { nurseId, date, shift: newShift as any }];
      }
    });
  };

  const handleCellClick = (nurseId: number, date: number) => {
    setSelectedCell({ nurseId, date });
    setShowEditDialog(true);
  };

  const handleDragStart = (nurseId: number, date: number) => {
    const shift = getShift(nurseId, date);
    setDraggedCell({ nurseId, date, shift });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (nurseId: number, date: number) => {
    if (!draggedCell) return;

    // Swap shifts between cells
    const draggedShift = draggedCell.shift;
    const targetShift = getShift(nurseId, date);

    handleShiftChange(draggedCell.nurseId, draggedCell.date, targetShift);
    handleShiftChange(nurseId, date, draggedShift);

    setDraggedCell(null);
    toast.success("근무가 교환되었습니다");
  };

  const handleReset = () => {
    setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    toast.info("변경 사항이 취소되었습니다");
  };

  const handleSave = async () => {
    if (!onSave) {
      toast.error("저장 기능이 구성되지 않았습니다");
      return;
    }

    try {
      setIsSaving(true);
      await onSave(schedule);
      setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
      toast.success("근무표가 저장되었습니다");
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const nightShifts = new Map<number, number>();
    const offDays = new Map<number, number>();

    nurses.forEach((nurse) => {
      let nights = 0;
      let offs = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const shift = getShift(nurse.id, d);
        if (shift === "night") nights++;
        if (shift === "off") offs++;
      }
      nightShifts.set(nurse.id, nights);
      offDays.set(nurse.id, offs);
    });

    return { nightShifts, offDays };
  }, [schedule, daysInMonth, getShift, nurses]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>근무표 편집</CardTitle>
              <CardDescription>클릭 또는 드래그로 근무를 편집하세요</CardDescription>
            </div>
            <div className="flex gap-2">
              {hasChanges && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950">
                  변경됨
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">{monthName}</h3>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 flex-wrap text-sm">
            {Object.entries(SHIFT_TYPES).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded text-center text-xs font-bold flex items-center justify-center ${value.color}`}>
                  {value.abbr}
                </div>
                <span>{value.label}</span>
              </div>
            ))}
          </div>

          {/* Schedule Grid */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="px-3 py-2 text-left font-semibold w-24">간호사</th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const date = i + 1;
                    const dayOfWeek = new Date(currentYear, currentMonth - 1, date).getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    return (
                      <th
                        key={date}
                        className={`px-2 py-2 text-center font-semibold text-xs w-10 ${
                          isWeekend ? "bg-red-50 dark:bg-red-950" : ""
                        }`}
                      >
                        {date}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {nurses.map((nurse) => (
                  <tr key={nurse.id} className="border-b hover:bg-muted/50">
                    <td className="px-3 py-2 font-medium text-sm">{nurse.name}</td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const date = i + 1;
                      const shift = getShift(nurse.id, date);
                      const dayOfWeek = new Date(currentYear, currentMonth - 1, date).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isSelected = selectedCell?.nurseId === nurse.id && selectedCell?.date === date;
                      const isDragging = draggedCell?.nurseId === nurse.id && draggedCell?.date === date;

                      return (
                        <td
                          key={date}
                          className={`px-2 py-2 text-center text-xs w-10 ${
                            isWeekend ? "bg-red-50 dark:bg-red-950" : ""
                          }`}
                        >
                          <button
                            onClick={() => handleCellClick(nurse.id, date)}
                            onDragStart={() => handleDragStart(nurse.id, date)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(nurse.id, date)}
                            draggable
                            className={`w-full px-1 py-1 rounded font-bold text-xs transition-all ${
                              SHIFT_TYPES[shift].color
                            } ${isSelected ? "ring-2 ring-primary" : ""} ${
                              isDragging ? "opacity-50" : ""
                            } hover:shadow-md cursor-move`}
                          >
                            {SHIFT_TYPES[shift].abbr}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {nurses.map((nurse) => (
              <Card key={nurse.id} className="bg-muted/50">
                <CardContent className="pt-4 space-y-1 text-sm">
                  <p className="font-medium">{nurse.name}</p>
                  <p className="text-xs text-muted-foreground">
                    야간: {stats.nightShifts.get(nurse.id) || 0}회
                  </p>
                  <p className="text-xs text-muted-foreground">
                    휴무: {stats.offDays.get(nurse.id) || 0}일
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving && <span className="animate-spin mr-2">⌛</span>}
              <Save className="w-4 h-4 mr-2" />
              저장
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedCell && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>근무 편집</DialogTitle>
              <DialogDescription>
                {nurses.find((n) => n.id === selectedCell.nurseId)?.name} - {selectedCell.date}일
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">근무 유형</label>
                <Select
                  value={getShift(selectedCell.nurseId, selectedCell.date)}
                  onValueChange={(value) => {
                    handleShiftChange(selectedCell.nurseId, selectedCell.date, value);
                    setShowEditDialog(false);
                    toast.success("근무가 변경되었습니다");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_ORDER.map((shift) => (
                      <SelectItem key={shift} value={shift}>
                        {SHIFT_TYPES[shift].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
