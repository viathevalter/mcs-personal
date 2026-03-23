import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IbanPdfData {
    workerNome: string;
    workerNif: string | null;
    workerPasaporte: string | null;
    empresaContratante: string;
    banco: string;
    iban: string;
}

export function generateIbanAuthDoc(data: IbanPdfData) {
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    
    // Tratativa Audio 2: "com documento fiscal NIF tal" / "com passaporte tal"
    let docText = "";
    if (data.workerNif && data.workerNif.trim() !== "") {
        docText = `documento fiscal NIF nº <strong>${data.workerNif}</strong>`;
    } else if (data.workerPasaporte && data.workerPasaporte.trim() !== "") {
        docText = `PASAPORTE nº <strong>${data.workerPasaporte}</strong>`;
    } else {
        docText = `documento de identificação pendente`;
    }

    // Tratativa Audio 1: Empresa Contratante
    const empresaNome = data.empresaContratante || "Mastercorp";
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt">
        <head>
            <meta charset="UTF-8">
            <title>Termo de Autorização de Depósito</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 60px 40px;
                }
                .top-date {
                    text-align: right;
                    margin-bottom: 40px;
                    font-size: 15px;
                }
                .header-address {
                    margin-bottom: 40px;
                    line-height: 1.3;
                    font-size: 15px;
                }
                .content {
                    text-align: justify;
                    margin-bottom: 30px;
                    font-size: 15px;
                }
                .data-box {
                    background-color: #f7fcfb;
                    border: 1px solid #e2e8f0;
                    padding: 25px;
                    margin-bottom: 30px;
                    border-radius: 8px;
                }
                .data-row {
                    margin-bottom: 12px;
                    font-size: 15px;
                }
                .label {
                    font-weight: bold;
                    display: inline-block;
                    width: 170px;
                }
                .signature-section {
                    margin-top: 100px;
                    text-align: center;
                }
                .signature-line {
                    border-top: 1px solid #000;
                    width: 350px;
                    margin: 0 auto 10px auto;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="top-date">
                Vila nova de Gaia, ${today}.
            </div>

            <div class="header-address">
                <p style="margin: 0;">À <strong>${empresaNome}</strong>, LDA</p>
                <p style="margin: 0;">Aos cuidados do Departamento de Administração</p>
                <p style="margin: 0; font-weight: bold;">Assunto: Solicitação de alteração de conta bancária domiciliada</p>
            </div>

            <div class="content">
                <p style="margin-bottom: 30px;">Prezada ${empresaNome} LDA,</p>
                
                <p>
                    Eu, <strong>${data.workerNome}</strong> com ${docText}, solicito alteração da conta bancária onde meu salário é depositado.
                </p>
                
                <p>
                    Gostaria de solicitar que, a partir do próximo ciclo de pagamento, meu salário seja depositado na seguinte conta bancária:
                </p>
            </div>

            <div class="data-box">
                <div class="data-row">
                    <span class="label">Nome do Banco:</span>
                    <span><strong>${data.banco}</strong></span>
                </div>
                <div class="data-row">
                    <span class="label">IBAN da Conta:</span>
                    <span style="font-family: monospace; font-size: 17px;"><strong>${data.iban}</strong></span>
                </div>
                <div class="data-row" style="margin-top: 20px;">
                    <span class="label">Motivo da alteração:</span>
                    <span>Pessoais.</span>
                </div>
            </div>

            <div class="content">
                <p>
                    Sem mais para o momento, subscrevo-me, apresentando os melhores cumprimentos.
                </p>
            </div>

            <div class="signature-section">
                <div class="signature-line"></div>
                <p style="font-weight: bold; font-size: 16px; text-transform: uppercase;">${data.workerNome}</p>
            </div>

            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
}
