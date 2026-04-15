import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useState } from "react";
import ShiftSwapDialog from "./ShiftSwapDialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ScheduleBuilderProps {
  wardId?: number;
  year?: number;
  month?: number;
  onScheduleChange?: (schedule: any) => void;
}

const SHIFT_TYPES = {
  day: { label: "주간", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  evening: { label: "저녁", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  night: { label: "야간", color: "bg-slate-700 text-slate-100 dark:bg-slate-600 dark:text-slate-200" },
  off: { label: "휴무", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

// Mock data for demonstration
const mockNurses = [
  { id: 1, name: "김영희", careerYears: 5 },
  { id: 2, name: "이순신", careerYears: 3 },
  { id: 3, name: "박민준", careerYears: 1 },
  { id: 4, name: "정수현", careerYears: 8 },
];

const mockSchedule = Array.from({ length: 30 }, (_, i) => ({
  date: i + 1,
  isWeekend: (i + 1) % 7 === 0 || (i + 1) % 7 === 6,
  shifts: mockNurses.map(() => {
    const random = Math.random();
    if (random < 0.3) return "day";
    if (random < 0.6) return "evening";
    if (random < 0.85) return "night";
    return "off";
  }),
}));

export function ScheduleBuilder({ wardId, year = 2026, month = 4 }: ScheduleBuilderProps) {
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);
  const [selectedCell, setSelectedCell] = useState<{ nurseId: number; date: number } | null>(null);
  const swapMutation = trpc.shiftAssignment.swap.useMutation();

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

  const handleAutoSchedule = () => {
    // Placeholder for AI scheduling
    console.log("Auto-scheduling triggered");
  };

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>근무표 빌더</CardTitle>
            <CardDescription>드래그하여 근무를 배정하세요</CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={handleAutoSchedule}>
            <Zap className="w-4 h-4" />
            AI 자동 배정
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <h3 className="text-lg font-semibold">{monthName}</h3>
          <ShiftSwapDialog
            nurses={mockNurses}
            assignments={mockSchedule.flatMap((day) =>
              mockNurses.map((nurse, idx) => ({
                id: idx,
                nurseId: nurse.id,
                date: `2026-04-${String(day.date).padStart(2, "0")}`,
                shiftType: day.shifts[nurse.id - 1] as "day" | "evening" | "night" | "off",
              }))
            )}
            onSwap={async (nurse1Id, nurse2Id, date) => {
              try {
                await swapMutation.mutateAsync({
                  nurse1Id,
                  nurse2Id,
                  date,
                  scheduleId: 1,
                });
                toast.success("근무가 교환되었습니다");
              } catch (error) {
                toast.error("근무 교환에 실패했습니다");
                throw error;
              }
            }}
          />
        </div>

        {/* Gantt Chart */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header - Dates */}
            <div className="flex gap-0.5 mb-2">
              <div className="w-32 flex-shrink-0" />
              {mockSchedule.map((day) => (
                <div
                  key={day.date}
                  className={`w-12 h-10 flex items-center justify-center text-xs font-medium rounded-t ${
                    day.isWeekend ? "bg-red-50 dark:bg-red-950" : "bg-muted"
                  }`}
                >
                  {day.date}
                </div>
              ))}
            </div>

            {/* Nurse rows */}
            {mockNurses.map((nurse) => (
              <div key={nurse.id} className="flex gap-0.5 mb-1">
                {/* Nurse name */}
                <div className="w-32 flex-shrink-0 flex items-center px-3 bg-card border border-border rounded text-sm font-medium">
                  <div>
                    <div>{nurse.name}</div>
                    <div className="text-xs text-muted-foreground">경력 {nurse.careerYears}년</div>
                  </div>
                </div>

                {/* Shift cells */}
                {mockSchedule.map((day) => {
                  const shiftType = day.shifts[nurse.id - 1] as keyof typeof SHIFT_TYPES;
                  const shiftInfo = SHIFT_TYPES[shiftType];
                  const isSelected = selectedCell?.nurseId === nurse.id && selectedCell?.date === day.date;

                  return (
                    <div
                      key={`${nurse.id}-${day.date}`}
                      onClick={() => setSelectedCell({ nurseId: nurse.id, date: day.date })}
                      className={`w-12 h-10 flex items-center justify-center text-xs font-medium rounded cursor-pointer transition-all ${
                        shiftInfo.color
                      } ${isSelected ? "ring-2 ring-accent" : ""} ${
                        day.isWeekend ? "opacity-75" : ""
                      } hover:shadow-md`}
                      title={`${nurse.name} - ${day.date}일: ${shiftInfo.label}`}
                    >
                      {shiftInfo.label.charAt(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {Object.entries(SHIFT_TYPES).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded ${value.color}`} />
              <span>{value.label}</span>
            </div>
          ))}
        </div>

        {/* Info */}
        {selectedCell && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-900 dark:text-blue-200">
            <strong>{mockNurses[selectedCell.nurseId - 1]?.name}</strong>의{" "}
            <strong>{selectedCell.date}일</strong> 근무를 선택했습니다. 드래그하여 변경하거나 우클릭으로 메뉴를 열 수 있습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
