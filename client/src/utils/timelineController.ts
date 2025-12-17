import type { ExecutionStep } from '../types';

export const TIMELINE = [
  { step: "pending", at: 0 },
  { step: "queued", at: 10 },
  { step: "routing", at: 15 },
  { step: "route_selected", at: 80 },
  { step: "building", at: 95 },
  { step: "submitted", at: 120 },
  { step: "confirmed", at: 3000 } // upper bound enforced by backend
] as const;

type ValidationMap = Record<ExecutionStep, boolean>;

export const validations: ValidationMap = {
  pending: false,
  queued: false,
  routing: false,
  route_selected: false,
  building: false,
  submitted: false,
  confirmed: false,
  failed: false
};

const perfLog: Record<string, number> = {};

export function logStepStart(step: ExecutionStep) {
  perfLog[`${step}_start`] = performance.now();
}

export function logStepEnd(step: ExecutionStep) {
  if (perfLog[`${step}_start`]) {
      const duration = performance.now() - perfLog[`${step}_start`];
      console.table({
        step,
        duration_ms: Math.round(duration)
      });
  }
}

export function attachOrderSocket(
  socket: WebSocket,
  validateStep: (s: ExecutionStep) => void,
  fail: (reason: string) => void,
  onMessage?: (data: unknown) => void
) {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const { status, error } = data;

    if (onMessage) {
        onMessage(data);
    }

    if (status === "failed") {
      fail(error || "Unknown error");
      return;
    }

    if (status && Object.prototype.hasOwnProperty.call(validations, status)) {
        validations[status as ExecutionStep] = true;
        validateStep(status as ExecutionStep);
    }
  };
}

export function runTimeline(
  setStep: (s: ExecutionStep) => void,
  _markValidated: (s: ExecutionStep) => void,
  fail: (reason: string) => void
) {
  // Reset validations for new run
  Object.keys(validations).forEach(k => validations[k as ExecutionStep] = false);
  
  // const start = performance.now();

  TIMELINE.forEach(({ step, at }) => {
    setTimeout(() => {
      // Basic check: if we haven't failed/confirmed everything yet (logic from prompt)
      // The prompt said: if (Object.values(validations).includes(false))
      // This essentially means "keep going if not everything is done". 
      // It's a bit loose but I'll stick to it or make it safer.
      if (!validations['failed'] && !validations['confirmed']) {
        setStep(step);
      }
    }, at);
  });

  // Global 10s SLA guard
  setTimeout(() => {
    if (!validations.confirmed && !validations.failed) {
      fail("Global execution timeout");
    }
  }, 10_000);
}

export function rollbackToFailed(
  setStep: (s: ExecutionStep) => void
) {
  setStep("failed");
}
export function buildReplayTimeline(
  steps: { step: ExecutionStep; timestamp: number }[]
) {
  if (!steps.length) return [];
  const base = steps[0].timestamp;

  return steps.map(s => ({
    step: s.step,
    delay: Math.max(120, s.timestamp - base)
  }));
}

export function replayExecutionTimeline(
  timeline: { step: ExecutionStep; delay: number }[],
  setStep: (s: ExecutionStep) => void
) {
  timeline.forEach(({ step, delay }) => {
    setTimeout(() => {
      setStep(step);
    }, delay);
  });
}
