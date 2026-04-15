import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Eye, Edit2, Trash2, Download } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ScheduleCreationDialog } from "@/components/ScheduleCreationDialog";

const statusColors = {
  "작성 중": "bg-yellow-100 text-yellow-800",
  "확정": "bg-blue-100 text-blue-800",
  "배포됨": "bg-green-100 text-green-800",
};

export default function ScheduleList() {
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterWard, setFilterWard] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [filterMonth, setFilterMonth] = useState("");

  // Fetch schedules from database
  const { data: schedules = [], isLoading, refetch } = trpc.schedule.list.useQuery();
  const deleteSchedule = trpc.schedule.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Filter schedules
  const filteredSchedules = schedules.filter((schedule) => {
    if (filterWard !== "전체" && schedule.wardName !== filterWard) return false;
    if (filterStatus !== "전체" && schedule.status !== filterStatus) return false;
    if (filterMonth) {
      const [year, month] = filterMonth.split("-");
      if (schedule.year !== parseInt(year) || schedule.month !== parseInt(month))
        return false;
    }
    return true;
  });

  const handleViewSchedule = (scheduleId: number) => {
    setLocation(`/admin/schedules/${scheduleId}`);
  };

  const handleEditSchedule = (scheduleId: number) => {
    setLocation(`/admin/schedules/${scheduleId}?edit=true`);
  };

  const handleDeleteSchedule = (scheduleId: number) => {
    if (confirm("이 근무표를 삭제하시겠습니까?")) {
      deleteSchedule.mutate({ scheduleId });
    }
  };

  const handleDownloadSchedule = (schedule: typeof schedules[0]) => {
    // Generate CSV export
    const csv = generateScheduleCSV(schedule);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `schedule_${schedule.wardName}_${schedule.year}${String(schedule.month).padStart(2, "0")}.csv`
    );
    link.click();
  };

  const generateScheduleCSV = (schedule: typeof schedules[0]) => {
    const headers = ["간호사명", "1월", "2월", "3월", "4월", "5월", "6월"];
    const rows = [headers.join(",")];
    // Add nurse data here
    return rows.join("\n");
  };

  // Get unique wards from schedules
  const uniqueWards: string[] = ["전체"];
  const wardSet = new Set<string>();
  schedules.forEach((s) => {
    wardSet.add(s.wardName);
  });
  uniqueWards.push(...Array.from(wardSet));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-6 h-screen">
          <p className="text-muted-foreground">근무표 목록을 불러오는 중...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">근무표 관리</h1>
            <p className="text-muted-foreground mt-2">병동별 월간 근무표를 관리합니다</p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            새 근무표 생성
          </Button>
        </div>

        {/* Create Schedule Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <ScheduleCreationDialog
              onScheduleCreated={() => {
                setShowCreateDialog(false);
                refetch();
              }}
            />
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">필터</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">병동:</label>
              <select
                className="px-3 py-2 border rounded-md text-sm"
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
              >
                {uniqueWards.map((ward: string) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">상태:</label>
              <select
                className="px-3 py-2 border rounded-md text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="전체">전체</option>
                <option value="작성 중">작성 중</option>
                <option value="확정">확정</option>
                <option value="배포됨">배포됨</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">연월:</label>
              <input
                type="month"
                className="px-3 py-2 border rounded-md text-sm"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Table */}
        <Card>
          <CardHeader>
            <CardTitle>근무표 목록</CardTitle>
            <CardDescription>총 {filteredSchedules.length}개의 근무표</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">근무표가 없습니다.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  새 근무표 생성하기
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>병동</TableHead>
                    <TableHead>연월</TableHead>
                    <TableHead>간호사 수</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={(schedule as typeof schedules[0]).id}>
                      <TableCell className="font-medium">{(schedule as typeof schedules[0]).wardName}</TableCell>
                      <TableCell>
                        {(schedule as typeof schedules[0]).year}년 {String((schedule as typeof schedules[0]).month).padStart(2, "0")}월
                      </TableCell>
                      <TableCell>{(schedule as typeof schedules[0]).nurseCount || 0}명</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[(schedule.status || "작성 중") as keyof typeof statusColors]
                          }
                        >
                          {schedule.status || "작성 중"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(schedule.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="상세 보기"
                            onClick={() => handleViewSchedule(schedule.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="편집"
                            onClick={() => handleEditSchedule(schedule.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="다운로드"
                            onClick={() => handleDownloadSchedule(schedule as typeof schedules[0])}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="삭제"
                            onClick={() => handleDeleteSchedule((schedule as typeof schedules[0]).id)}
                            disabled={deleteSchedule.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
