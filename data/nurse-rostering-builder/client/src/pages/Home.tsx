import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Calendar, Users, Zap, TrendingUp, Shield, Bell } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, user?.role, navigate]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-accent" />
            <span className="text-xl font-bold">근무표 빌더</span>
          </div>
          <Button variant="outline">로그인</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter">
              한국 병원을 위한
              <br />
              <span className="text-accent">스마트 근무표 관리</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              3교대 근무 규칙을 자동으로 최적화하고, 간호사의 만족도를 높이며, 환자 안전을 보장하는 AI 기반 플랫폼
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" className="gap-2">
              시작하기
            </Button>
            <Button size="lg" variant="outline">
              데모 보기
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-12">
            <div className="text-center">
              <div className="text-2xl font-bold">90%</div>
              <p className="text-sm text-muted-foreground">시간 단축</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">95%</div>
              <p className="text-sm text-muted-foreground">선호도 반영</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <p className="text-sm text-muted-foreground">지원</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-20 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">핵심 기능</h2>
          <p className="text-muted-foreground">
            수간호사와 간호사 모두를 위한 완벽한 근무표 관리 솔루션
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">AI 자동 스케줄링</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                한국 병원의 복잡한 근무 규칙을 AI가 자동으로 최적화하여 3~4시간 소요되던 작업을 1분 이내로 단축합니다.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg">역할 기반 대시보드</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                수간호사는 병동 전체 관리, 간호사는 개인 일정 확인과 오프 신청을 쉽게 처리합니다.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-lg">간트 차트 빌더</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                직관적인 간트 차트로 근무를 시각화하고 드래그 앤 드롭으로 쉽게 편집합니다.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-lg">실시간 알림</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                근무표 확정, 오프 신청 승인, 근무 교환 요청 등 모든 변경사항을 실시간으로 알립니다.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-lg">규칙 자동 검증</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                최소 휴식 시간, 연속 야간 근무 제한 등 한국 병원 규칙을 자동으로 검증합니다.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle className="text-lg">공정성 분석</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                간호사별 근무 시간, 야간 근무 횟수, 주말 근무 현황을 시각화하여 공정성을 보장합니다.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container py-20 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">기대 효과</h2>
          <p className="text-muted-foreground">
            근무표 관리의 효율성과 공정성을 동시에 달성합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">수간호사</h3>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>월간 근무표 작성 시간 90% 단축</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>규칙 위반 자동 감지 및 방지</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>간호사 요청 관리 자동화</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>공정성 지표로 신뢰도 증대</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">간호사</h3>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>선호도 반영률 95% 이상</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>모바일에서 쉬운 오프 신청</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>동료와 자율적 근무 교환</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent font-bold">✓</span>
                <span>일과 삶의 균형 개선</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <Card className="bg-accent text-accent-foreground border-0">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl md:text-3xl">
              지금 바로 시작하세요
            </CardTitle>
            <CardDescription className="text-accent-foreground/80">
              한국 병원의 근무표 관리를 혁신하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button size="lg" variant="secondary" className="gap-2">
              무료 시작하기
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/50">
        <div className="container py-12">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2026 한국형 간호사 근무표 빌더. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
