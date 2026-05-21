import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '../api/auditLogsApi';

export function useAuditLogs(recordId: string) {
  return useQuery({
    queryKey: ['auditLogs', recordId],
    queryFn: () => auditLogsApi.getLogsByRecordId(recordId),
    enabled: !!recordId,
  });
}
