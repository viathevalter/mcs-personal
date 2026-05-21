import { supabase } from '@/shared/supabase/client';

export interface AuditLog {
  id: string;
  empresa_id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'ARCHIVE';
  old_data: any;
  new_data: any;
  changed_by: string;
  created_at: string;
}

export const auditLogsApi = {
  async getLogsByRecordId(recordId: string): Promise<AuditLog[]> {
    if (!recordId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('audit_logs')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AuditLog[];
  }
};
