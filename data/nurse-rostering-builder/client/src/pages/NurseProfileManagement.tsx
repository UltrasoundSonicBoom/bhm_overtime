import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, Building2, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import WardNurseList from "@/components/WardNurseList";

export default function NurseProfileManagement() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p>접근 권한이 없습니다</p>
        </div>
      </DashboardLayout>
    );
  }
  const [activeTab, setActiveTab] = useState("wards");
  const [openWardDialog, setOpenWardDialog] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [newWard, setNewWard] = useState({ name: "" });

  // Fetch wards
  const { data: wardsData = [], isLoading: wardsLoading, refetch: refetchWards } = trpc.ward.list.useQuery();

  // Mutations
  const createWardMutation = trpc.ward.create.useMutation({
    onSuccess: () => {
      toast.success("병동이 생성되었습니다");
      refetchWards();
      setNewWard({ name: "" });
      setOpenWardDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "병동 생성 실패");
    },
  });

  const deleteWardMutation = trpc.ward.delete.useMutation({
    onSuccess: () => {
      toast.success("병동이 삭제되었습니다");
      refetchWards();
      if (selectedWardId) setSelectedWardId(null);
    },
    onError: (error) => {
      toast.error(error.message || "병동 삭제 실패");
    },
  });

  const handleAddWard = () => {
    if (!newWard.name) {
      toast.error("병동 이름을 입력해주세요");
      return;
    }
    createWardMutation.mutate({ name: newWard.name });
  };

  const handleDeleteWard = (wardId: number) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteWardMutation.mutate({ wardId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">간호사 및 병동 관리</h1>
          <p className="text-muted-foreground mt-2">간호사 프로필과 병동 정보를 관리합니다</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="wards" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              병동 및 간호사 관리
            </TabsTrigger>
          </TabsList>

          {/* Wards and Nurses Tab */}
          <TabsContent value="wards" className="space-y-4">
            {/* Ward Management Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>병동 목록</CardTitle>
                  <CardDescription>병동 정보를 관리합니다</CardDescription>
                </div>
                <Dialog open={openWardDialog} onOpenChange={setOpenWardDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      병동 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>병동 추가</DialogTitle>
                      <DialogDescription>새로운 병동을 추가하세요</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="ward-name">병동명</Label>
                        <Input
                          id="ward-name"
                          value={newWard.name}
                          onChange={(e) => setNewWard({ name: e.target.value })}
                          placeholder="예: 101 병동"
                        />
                      </div>
                      <Button onClick={handleAddWard} disabled={createWardMutation.isPending} className="w-full">
                        {createWardMutation.isPending ? (
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
                {wardsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : wardsData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    등록된 병동이 없습니다
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wardsData.map((ward) => (
                      <Card
                        key={ward.id}
                        className={`cursor-pointer transition-colors ${
                          selectedWardId === ward.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedWardId(ward.id)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{ward.name}</h3>
                              <p className="text-sm text-muted-foreground">ID: {ward.id}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWard(ward.id);
                              }}
                              disabled={deleteWardMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nurse List Section */}
            {selectedWardId && (
              <WardNurseList
                wardId={selectedWardId}
                wardName={wardsData.find((w) => w.id === selectedWardId)?.name || ""}
              />
            )}

            {!selectedWardId && wardsData.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg font-medium">병동을 선택하세요</p>
                    <p className="text-sm mt-2">위의 병동 목록에서 병동을 선택하면 해당 병동의 간호사 목록을 볼 수 있습니다</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
