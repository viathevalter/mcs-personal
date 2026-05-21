import { supabase } from '../supabaseClient';

export interface Employee {
    id: string;
    department_id: string;
    department_name?: string;
    user_id?: string | null;
    active: boolean;
    empresa_contratante_id?: number | null;
    empresa_contratante_nome?: string;
    empresa_servicos_id?: number | null;
    empresa_servicos_nome?: string;
    nombrecompleto: string;
    correoempresarial?: string;
    ubicaciontrabajo?: string;
    codigoresponsabilidad?: string;
    telefonodirecto?: string;
    extenciontelefonica?: string;
    fechainicio?: string;
    fechanacimiento?: string;
    estadotrabajador?: string;
    iban?: string;
    usuario?: string;
}

export const supabaseEmployeeService = {
    list: async (): Promise<Employee[]> => {
        // Using alias for joined tables
        const { data, error } = await supabase
            .from('mcs_department_members')
            .select(`
        *,
        mcs_departments (
          name
        ),
        empresa_contratante:empresas!empresa_contratante_id (
          nome_pbi
        ),
        empresa_servicos:empresas!empresa_servicos_id (
          nome_pbi
        )
      `)
            .order('nombrecompleto');

        if (error) {
            console.error('Error listing employees:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            department_id: row.department_id,
            department_name: row.mcs_departments?.name,
            user_id: row.user_id,
            active: row.active,
            empresa_contratante_id: row.empresa_contratante_id,
            empresa_contratante_nome: row.empresa_contratante?.nome_pbi,
            empresa_servicos_id: row.empresa_servicos_id,
            empresa_servicos_nome: row.empresa_servicos?.nome_pbi,
            nombrecompleto: row.nombrecompleto || 'Sem Nome',
            correoempresarial: row.correoempresarial,
            ubicaciontrabajo: row.ubicaciontrabajo,
            codigoresponsabilidad: row.codigoresponsabilidad,
            telefonodirecto: row.telefonodirecto,
            extenciontelefonica: row.extenciontelefonica,
            fechainicio: row.fechainicio,
            fechanacimiento: row.fechanacimiento,
            estadotrabajador: row.estadotrabajador,
            iban: row.iban,
            usuario: row.usuario
        }));
    },

    create: async (employee: Partial<Employee>): Promise<Employee | null> => {
        const dbPayload: any = {
            department_id: employee.department_id,
            user_id: employee.user_id || null,
            active: employee.active !== undefined ? employee.active : true,
            member_role: 'member',
            empresa_contratante_id: employee.empresa_contratante_id || null,
            empresa_servicos_id: employee.empresa_servicos_id || null,
            nombrecompleto: employee.nombrecompleto,
            correoempresarial: employee.correoempresarial,
            ubicaciontrabajo: employee.ubicaciontrabajo,
            codigoresponsabilidad: employee.codigoresponsabilidad,
            telefonodirecto: employee.telefonodirecto,
            extenciontelefonica: employee.extenciontelefonica,
            fechainicio: employee.fechainicio,
            fechanacimiento: employee.fechanacimiento,
            estadotrabajador: employee.estadotrabajador,
            iban: employee.iban,
            usuario: employee.usuario
        };

        // Clean up undefined
        Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

        const { data, error } = await supabase
            .from('mcs_department_members')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Error creating employee:', error);
            return null;
        }

        return { ...employee, id: data.id } as Employee;
    },

    update: async (id: string, employee: Partial<Employee>): Promise<boolean> => {
        const dbPayload: any = {
            department_id: employee.department_id,
            empresa_contratante_id: employee.empresa_contratante_id || null,
            empresa_servicos_id: employee.empresa_servicos_id || null,
            nombrecompleto: employee.nombrecompleto,
            correoempresarial: employee.correoempresarial,
            ubicaciontrabajo: employee.ubicaciontrabajo,
            codigoresponsabilidad: employee.codigoresponsabilidad,
            telefonodirecto: employee.telefonodirecto,
            extenciontelefonica: employee.extenciontelefonica,
            fechainicio: employee.fechainicio,
            fechanacimiento: employee.fechanacimiento,
            estadotrabajador: employee.estadotrabajador,
            iban: employee.iban,
            usuario: employee.usuario,
            active: employee.active // Ensure active status is updated
        };

        // Clean up undefined
        Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

        const { error } = await supabase
            .from('mcs_department_members')
            .update(dbPayload)
            .eq('id', id);

        if (error) {
            console.error('Error updating employee:', error);
            return false;
        }
        return true;
    },

    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase
            .from('mcs_department_members')
            .update({ active: false, estadotrabajador: 'Inativo' }) // Update status textual as well
            .eq('id', id);

        if (error) {
            console.error('Error deleting employee:', error);
            return false;
        }
        return true;
    }
};
