-- Script para consultar os valores aceitos no check constraint user_memberships_role_check
SELECT 
    conname AS constraint_name, 
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM 
    pg_constraint c
JOIN 
    pg_class t ON c.conrelid = t.oid
JOIN 
    pg_namespace n ON t.relnamespace = n.oid
WHERE 
    n.nspname = 'core_common' 
    AND t.relname = 'user_memberships' 
    AND c.conname = 'user_memberships_role_check';
