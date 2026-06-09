const fs = require('fs');
const { createReport } = require('docx-templates');

async function test() {
    try {
        console.log("Reading default.docx...");
        const templateBuffer = fs.readFileSync('default.docx');
        
        const mergeData = {
          empresa_nome: "CIA TALLER SL",
          empresa_nif: "NIF123",
          empresa_telefone: "123456",
          empresa_email: "vendas@stoco.es",
          
          proposta_codigo: "EST-20260522-F202",
          proposta_data: new Date().toLocaleDateString("pt-PT"),
          proposta_validade: new Date().toLocaleDateString("pt-PT"),
          proposta_pagamento: "A combinar",
          proposta_notas: "Notas gerais da proposta",
          
          cliente_nome: "CIA TALLER SL",
          cliente_empresa: "stocco",
          cliente_email: "thevalter@gmail.com",
          cliente_telefone: "34 691 110 149",

          itens: [
            {
              funcao: "Programador",
              quantidade: 3,
              horas_dia: "8.00",
              dias_semana: 5,
              total_horas: 1584,
              tarifa_venda: 28,
              valor_total: "133056.00"
            }
          ],
          
          total_custo: "30480.00",
          total_receita: "44352.00",
          margem_percentual: "31.28"
        };

        console.log("Running createReport...");
        console.log("Running createReport...");
        const result = await createReport({
            template: templateBuffer,
            data: mergeData,
            cmdDelimiter: ["{{", "}}"],
            noSandbox: true,
            errorHandler: (err, command_code) => {
                console.error(`Erro no comando "${command_code}":`, err);
                return command_code;
            }
        });

        console.log("Result length:", result.length);
        fs.writeFileSync('scratch/output_test.docx', result);
        console.log("Success! Saved scratch/output_test.docx");
    } catch (err) {
        console.error("Error occurred in local test:", err);
    }
}

test();
