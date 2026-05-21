
export interface User {
  id: string;
  email: string;
  name: string;
  department_id: string; // ID do departamento (ex: 'dept-1' para Operações)
  role: 'admin' | 'user' | 'manager';
  avatar_initials: string;
  language: 'pt' | 'es'; // Added language preference
}

// Simulação de usuário logado
// Altere 'language' para 'es' para testar a internacionalização
export const authService = {
  getCurrentUser: (): User => {
    return {
      id: 'user-1',
      email: 'demo@mastercorp.local',
      name: 'Usuário Demo',
      department_id: 'dept-1', // Operações
      role: 'admin',
      avatar_initials: 'UD',
      language: 'pt' // Padrão PT
    };
  },

  updateUserContext: (overrides: Partial<User>) => {
      console.log('Context updated', overrides);
  }
};
