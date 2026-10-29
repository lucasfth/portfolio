export function createRequestCoordinator(): {
  begin(): { id: number; signal: AbortSignal };
  isCurrent(id: number): boolean;
  cancel(): void;
};
export function retainSuccessfulPayload<T extends { status?: string }>(previous: T | null, candidate: T | null): T | null;
export function payloadRefreshError(candidate: { status?: string } | null): string | null;
export function panelPayloadResult<T extends { status?: string }>(previous: T | null, candidate: T | null): { payload: T | null; error: string | null };
export function reportReadResult<T>(previous: T[] | null, result: { data: unknown; error: unknown }): { reports: T[] | null; error: string | null };
export function toggleExpanded(value: boolean): boolean;
