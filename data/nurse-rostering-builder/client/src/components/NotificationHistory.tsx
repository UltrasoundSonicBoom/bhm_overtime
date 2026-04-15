import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, XCircle, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export interface NotificationItem {
  id: number;
  type: "schedule_confirmed" | "off_approved" | "off_rejected" | "swap_approved" | "swap_rejected";
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedScheduleId?: number;
  relatedRequestId?: number;
}

interface NotificationHistoryProps {
  notifications: NotificationItem[];
  onMarkAsRead?: (id: number) => void;
  isLoading?: boolean;
}

export function NotificationHistory({
  notifications,
  onMarkAsRead,
  isLoading = false,
}: NotificationHistoryProps) {
  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "schedule_confirmed":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "off_approved":
      case "swap_approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "off_rejected":
      case "swap_rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: NotificationItem["type"]): string => {
    switch (type) {
      case "schedule_confirmed":
        return "근무표 확정";
      case "off_approved":
        return "오프 승인";
      case "off_rejected":
        return "오프 거절";
      case "swap_approved":
        return "교환 승인";
      case "swap_rejected":
        return "교환 거절";
      default:
        return "알림";
    }
  };

  const getTypeColor = (type: NotificationItem["type"]) => {
    switch (type) {
      case "schedule_confirmed":
        return "bg-blue-100 text-blue-800";
      case "off_approved":
      case "swap_approved":
        return "bg-green-100 text-green-800";
      case "off_rejected":
      case "swap_rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>알림 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>알림 이력</CardTitle>
          <CardDescription>알림 내역이 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">아직 알림이 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>알림 이력</CardTitle>
        <CardDescription>최근 알림 내역을 확인하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                notification.isRead ? "bg-background" : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <Badge className={`text-xs ${getTypeColor(notification.type)}`}>
                    {getTypeLabel(notification.type)}
                  </Badge>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 ml-auto" />
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-2">{notification.content}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notification.createdAt), "PPp", { locale: ko })}
                  </span>

                  {!notification.isRead && onMarkAsRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="text-xs"
                    >
                      읽음 표시
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
