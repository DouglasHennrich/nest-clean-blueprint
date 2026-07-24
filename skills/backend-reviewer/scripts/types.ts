export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Violation {
  file: string;
  line: number;
  rule: string;
  severity: Severity;
  detail: string;
}

export interface ValidatorResult {
  violations: Violation[];
  summary: Record<Severity, number>;
  filesChecked: number;
  attempt: number;
}

export interface FileClassification {
  services: string[];
  controllers: string[];
  repositories: string[];
  dtos: string[];
  exceptions: string[];
  specs: string[];
  others: string[];
  all: string[];
}
