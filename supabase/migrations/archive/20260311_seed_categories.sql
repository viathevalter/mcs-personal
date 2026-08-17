-- Script para inserir as categorias padrão em todas as empresas existentes no seu sistema

DO $$
DECLARE
    empresa RECORD;
BEGIN
    -- Percorre todas as empresas cadastradas no banco
    FOR empresa IN SELECT id FROM core_common.empresas LOOP
        
        -- Inserindo categorias de Descontos
        INSERT INTO core_personal.discount_categories (empresa_id, name) VALUES
            (empresa.id, 'IMPOSTO SS'),
            (empresa.id, 'ADIANTAMENTO'),
            (empresa.id, 'DESCONTO CARRO'),
            (empresa.id, 'MULTA TRANSITO'),
            (empresa.id, 'COMBUSTIBLE'),
            (empresa.id, 'PEAJES'),
            (empresa.id, 'SUMINISTROS'),
            (empresa.id, 'MULTA ALOJAMIENTO'),
            (empresa.id, 'LIMPIEZA O DAÑOS'),
            (empresa.id, 'EPIS'),
            (empresa.id, 'TAXA BANCÁRIA'),
            (empresa.id, 'OUTROS')
        ON CONFLICT (empresa_id, name) DO NOTHING;

        -- Inserindo categorias de Benefícios
        INSERT INTO core_personal.benefit_categories (empresa_id, name) VALUES
            (empresa.id, 'AUXILIO MORADIA')
        ON CONFLICT (empresa_id, name) DO NOTHING;
        
    END LOOP;
END $$;
