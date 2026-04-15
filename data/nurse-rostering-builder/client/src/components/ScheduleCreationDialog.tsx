import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues } from "react-hook-form";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const scheduleFormSchema = z.object({
  wardId: z.string().min(1, "병동을 선택해주세요"),
  year: z.coerce.number().min(2020).max(2100),
  month: z.coerce.number().min(1).max(12),
  dayShiftRequired: z.coerce.number().min(1),
  eveningShiftRequired: z.coerce.number().min(1),
  nightShiftRequired: z.coerce.number().min(1),
  weekendDayShiftRequired: z.coerce.number().min(0),
  weekendEveningShiftRequired: z.coerce.number().min(0),
  weekendNightShiftRequired: z.coerce.number().min(0),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface ScheduleCreationDialogProps {
  wards?: Array<{ id: number; name: string }>;
  onScheduleCreated?: (scheduleId: number) => void;
}

export function ScheduleCreationDialog({
  wards = [],
  onScheduleCreated,
}: ScheduleCreationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const createScheduleMutation = trpc.schedule.create.useMutation();
  const autoGenerateMutation = trpc.schedule.autoGenerate.useMutation();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema) as any as any,
    defaultValues: {
      wardId: "",
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      dayShiftRequired: 8,
      eveningShiftRequired: 8,
      nightShiftRequired: 8,
      weekendDayShiftRequired: 4,
      weekendEveningShiftRequired: 4,
      weekendNightShiftRequired: 4,
    },
  });

  async function onSubmit(data: any) {
    try {
      setIsGenerating(true);
      
      // Step 1: Create schedule
      const result = await createScheduleMutation.mutateAsync({
        wardId: parseInt(data.wardId),
        year: data.year,
        month: data.month,
        dayShiftRequired: data.dayShiftRequired,
        eveningShiftRequired: data.eveningShiftRequired,
        nightShiftRequired: data.nightShiftRequired,
        weekendDayShiftRequired: data.weekendDayShiftRequired,
        weekendEveningShiftRequired: data.weekendEveningShiftRequired,
        weekendNightShiftRequired: data.weekendNightShiftRequired,
      });

      if (!result.scheduleId) {
        throw new Error("근무표 생성에 실패했습니다");
      }

      // Step 2: Auto-generate assignments
      const genResult = await autoGenerateMutation.mutateAsync({
        scheduleId: result.scheduleId,
        wardId: parseInt(data.wardId),
      });

      toast.success(`${data.year}년 ${data.month}월 근무표가 생성되었습니다 (${genResult.assignmentCount}개 배정)`);
      setOpen(false);
      form.reset();

      if (onScheduleCreated && result.scheduleId) {
        onScheduleCreated(result.scheduleId);
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
      const errorMsg = error instanceof Error ? error.message : "근무표 생성에 실패했습니다";
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          새 근무표 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 근무표 생성</DialogTitle>
          <DialogDescription>
            월별 근무표를 생성하기 위해 필요한 정보를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Ward Selection */}
            <FormField
              control={form.control}
              name="wardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>병동 선택</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="병동을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {wards.map((ward) => (
                        <SelectItem key={ward.id} value={ward.id.toString()}>
                          {ward.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Year and Month */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연도</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>월</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Shift Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">평일 필요 인원</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dayShiftRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">주간</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eveningShiftRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">저녁</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nightShiftRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">야간</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Weekend Shift Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">주말 필요 인원</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="weekendDayShiftRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">주간</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weekendEveningShiftRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">저녁</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weekendNightShiftRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">야간</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createScheduleMutation.isPending || isGenerating}>
                {(createScheduleMutation.isPending || isGenerating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isGenerating ? "생성 중..." : "근무표 생성"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
