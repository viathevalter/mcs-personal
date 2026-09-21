# Regras do Projeto - Controle de Horas e Faturamento

- **Deploy em Produção Direto**: Sempre que finalizar e comitar alterações, realizar o push tanto na branch `dev` quanto fazer o merge e push na branch `main` para que o deploy de Produção na Vercel seja disparado automaticamente a cada entrega.
- **Edge Functions**: Sempre aplicar/fazer deploy das Edge Functions no projeto de Produção (`unbepkdzvsfvylnysrcq`) e, se aplicável, no de Desenvolvimento (`pyahcgorkvwfwmlzspnv`).
