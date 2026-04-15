import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Users, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WardNurseListProps {
  wardId: number;
  wardName: string;
}

export default function WardNurseList({ wardId, wardName }: WardNurseListProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [newNurse, setNewNurse] = useState({
    name: "",
    careerYears: 1,
    qualification: "RN",
    preferredShifts: "",
  });

  // Fetch nurses for this ward
  const { data: nurses = [], isLoading, refetch } = trpc.nurse.getByWard.useQuery(
    { wardId },
    { enabled: wardId > 0 }
  );

  // Add nurse mutation
  const addNurseMutation = trpc.nurse.create.useMutation({
    onSuccess: () => {
      toast.success("간호사가 추가되었습니다");
      refetch();
      setNewNurse({ name: "", careerYears: 1, qualification: "RN", preferredShifts: "" });
      setOpenDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "간호사 추가 실패");
    },
  });

  // Delete nurse mutation
  const deleteNurseMutation = trpc.nurse.delete.useMutation({
    onSuccess: () => {
      toast.success("간호사가 삭제되었습니다");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "간호사 삭제 실패");
    },
  });

  const handleAddNurse = () => {
    if (!newNurse.name.trim()) {
      toast.error("간호사 이름을 입력해주세요");
      return;
    }

    addNurseMutation.mutate({
      name: newNurse.name,
      careerYears: newNurse.careerYears,
      qualification: newNurse.qualification,
      preferredShifts: newNurse.preferredShifts,
      wardId,
    });
  };

  const handleDeleteNurse = (nurseId: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteNurseMutation.mutate({ nurseId });
    }
  };

  // Get qualification badge color
  const getQualificationColor = (qualification: string | null) => {
    switch (qualification) {
      case "CNS":
        return "bg-purple-100 text-purple-800";
      case "NP":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get career level badge
  const getCareerLevel = (years: string | null) => {
    if (!years) return "신입";
    const y = parseInt(years);
    if (y < 2) return "신입";
    if (y < 5) return "초급";
    if (y < 10) return "중급";
    return "고급";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {wardName} 간호사 목록
            </CardTitle>
            <CardDescription>
              현재 배정된 간호사: <span className="font-semibold text-foreground">{nurses.length}명</span>
            </CardDescription>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                간호사 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{wardName}에 간호사 추가</DialogTitle>
                <DialogDescription>새로운 간호사 정보를 입력하세요</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nurse-name">이름 *</Label>
                  <Input
                    id="nurse-name"
                    value={newNurse.name}
                    onChange={(e) => setNewNurse({ ...newNurse, name: e.target.value })}
                    placeholder="간호사 이름"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="career-years">경력 (년)</Label>
                    <Input
                      id="career-years"
                      type="number"
                      value={newNurse.careerYears}
                      onChange={(e) => setNewNurse({ ...newNurse, careerYears: parseInt(e.target.value) || 0 })}
                      min="0"
                      max="50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="qualification">자격</Label>
                    <Select
                      value={newNurse.qualification}
                      onValueChange={(val) => setNewNurse({ ...newNurse, qualification: val })}
                    >
                      <SelectTrigger id="qualification">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RN">RN (간호사)</SelectItem>
                        <SelectItem value="CNS">CNS (임상전문간호사)</SelectItem>
                        <SelectItem value="NP">NP (간호사 처방권자)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="preferred-shifts">선호 근무</Label>
                  <Input
                    id="preferred-shifts"
                    value={newNurse.preferredShifts}
                    onChange={(e) => setNewNurse({ ...newNurse, preferredShifts: e.target.value })}
                    placeholder="예: 주간, 저녁"
                  />
                </div>
                <Button onClick={handleAddNurse} disabled={addNurseMutation.isPending} className="w-full">
                  {addNurseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    "추가"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : nurses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">배정된 간호사가 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">위의 "간호사 추가" 버튼으로 간호사를 추가해주세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nurses.map((nurse, index) => (
                <div
                  key={nurse.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-base">{nurse.employeeId}</p>
                        <p className="text-sm text-muted-foreground">{nurse.qualification}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-11">
                      <Badge variant="outline" className={getQualificationColor(nurse.qualification)}>
                        {nurse.qualification}
                      </Badge>
                      <Badge variant="secondary">{getCareerLevel(nurse.careerYears)} ({nurse.careerYears}년)</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteNurse(nurse.id)}
                    disabled={deleteNurseMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {nurses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{nurses.length}</p>
                <p className="text-xs text-muted-foreground">총 인원</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {nurses.filter((n) => n.qualification === "RN").length}
                </p>
                <p className="text-xs text-muted-foreground">RN</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {nurses.filter((n) => n.qualification === "CNS").length}
                </p>
                <p className="text-xs text-muted-foreground">CNS</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.round(
                    nurses.reduce((sum, n) => sum + (parseInt(n.careerYears || "0") || 0), 0) / nurses.length
                  )}
                </p>
                <p className="text-xs text-muted-foreground">평균 경력</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
