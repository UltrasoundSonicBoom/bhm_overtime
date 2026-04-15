import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { ConstraintViolation, ValidationResult } from "@/lib/constraintValidator";

interface ConstraintAlertsProps {
  validationResult: ValidationResult;
  nurseNameMap?: Map<number, string>;
}

export function ConstraintAlerts({
  validationResult,
  nurseNameMap = new Map(),
}: ConstraintAlertsProps) {
  if (validationResult.violations.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-900 dark:text-green-100">제약 조건 충족</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          모든 근무 규칙이 만족되고 있습니다.
        </AlertDescription>
      </Alert>
    );
  }

  const errorViolations = validationResult.violations.filter((v) => v.severity === "error");
  const warningViolations = validationResult.violations.filter((v) => v.severity === "warning");
  const infoViolations = validationResult.violations.filter((v) => v.severity === "info");

  return (
    <div className="space-y-3">
      {/* Errors */}
      {errorViolations.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-900 dark:text-red-100">
            오류 ({errorViolations.length})
          </AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-200 mt-2 space-y-1">
            {errorViolations.map((violation, idx) => (
              <div key={idx} className="text-sm">
                <strong>{nurseNameMap.get(violation.nurseId) || `간호사 ${violation.nurseId}`}</strong>
                : {violation.message}
                {violation.dates.length > 0 && (
                  <span className="text-xs ml-2">
                    ({violation.dates.slice(0, 3).join(", ")}
                    {violation.dates.length > 3 && `... 등 ${violation.dates.length}일`})
                  </span>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warningViolations.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            경고 ({warningViolations.length})
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200 mt-2 space-y-1">
            {warningViolations.map((violation, idx) => (
              <div key={idx} className="text-sm">
                <strong>{nurseNameMap.get(violation.nurseId) || `간호사 ${violation.nurseId}`}</strong>
                : {violation.message}
                {violation.dates.length > 0 && (
                  <span className="text-xs ml-2">
                    ({violation.dates.slice(0, 3).join(", ")}
                    {violation.dates.length > 3 && `... 등 ${violation.dates.length}일`})
                  </span>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Info */}
      {infoViolations.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            정보 ({infoViolations.length})
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2 space-y-1">
            {infoViolations.map((violation, idx) => (
              <div key={idx} className="text-sm">
                <strong>{nurseNameMap.get(violation.nurseId) || `간호사 ${violation.nurseId}`}</strong>
                : {violation.message}
                {violation.dates.length > 0 && (
                  <span className="text-xs ml-2">
                    ({violation.dates.slice(0, 3).join(", ")}
                    {violation.dates.length > 3 && `... 등 ${violation.dates.length}일`})
                  </span>
                )}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="text-xs text-muted-foreground">
        총 {validationResult.violations.length}개의 이슈 발견 (오류: {validationResult.summary.errorCount}, 경고: {validationResult.summary.warningCount}, 정보: {validationResult.summary.infoCount})
      </div>
    </div>
  );
}
