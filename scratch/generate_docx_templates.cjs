const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const outputDir = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function createParagraph(text, options = {}) {
  const runs = [];
  if (Array.isArray(text)) {
    text.forEach(t => {
      runs.push(new TextRun({
        text: t.text,
        bold: t.bold || false,
        italic: t.italic || false,
        size: t.size || (options.fontSize ? options.fontSize * 2 : 20), // 10pt by default
        color: t.color || options.color || "222222",
        font: options.font || "Arial",
      }));
    });
  } else {
    runs.push(new TextRun({
      text: text,
      bold: options.bold || false,
      italic: options.italic || false,
      size: options.fontSize ? options.fontSize * 2 : 20,
      color: options.color || "222222",
      font: options.font || "Arial",
    }));
  }

  return new Paragraph({
    children: runs,
    alignment: options.alignment || AlignmentType.LEFT,
    spacing: {
      before: options.spaceBefore || 0,
      after: options.spaceAfter || 100, // 5pt after by default
    }
  });
}

function createHeaderCell(text, bgColor, alignment = AlignmentType.LEFT) {
  return new TableCell({
    children: [
      createParagraph(text, { bold: true, color: "FFFFFF", fontSize: 11, alignment })
    ],
    shading: {
      fill: bgColor,
    },
    margins: {
      top: 150,
      bottom: 150,
      left: 150,
      right: 150
    }
  });
}

function createTableCell(content, options = {}) {
  let children = [];
  if (typeof content === 'string') {
    children = [createParagraph(content, options)];
  } else if (Array.isArray(content)) {
    children = content;
  } else {
    children = [content];
  }

  return new TableCell({
    children: children,
    shading: options.bgColor ? { fill: options.bgColor } : undefined,
    margins: {
      top: 120,
      bottom: 120,
      left: 120,
      right: 120
    }
  });
}

function createLineBorder(color) {
  return {
    style: BorderStyle.SINGLE,
    size: 6,
    color: color || "DCE3EA"
  };
}

const tableBorders = {
  top: createLineBorder(),
  bottom: createLineBorder(),
  left: createLineBorder(),
  right: createLineBorder(),
  insideHorizontal: createLineBorder(),
  insideVertical: createLineBorder()
};

async function generateTemplate(companyName, logoText, headerBgColor, accentColor, webSite, filename) {
  console.log(`Generating template for ${companyName}...`);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 1. Corporate Header Band (Table)
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.SINGLE, size: 24, color: accentColor }, // Thick bottom accent border
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    createParagraph(logoText, { bold: true, color: "FFFFFF", fontSize: 22, spaceAfter: 0 })
                  ],
                  shading: { fill: headerBgColor },
                  margins: { top: 300, bottom: 300, left: 300, right: 300 }
                }),
                new TableCell({
                  children: [
                    createParagraph("PRESUPUESTO ANEXO AL CONTRATO", { bold: true, color: "FFFFFF", fontSize: 13, alignment: AlignmentType.RIGHT, spaceAfter: 0 }),
                    createParagraph("Servicios industriales especializados", { italic: true, color: "FFFFFF", fontSize: 9, alignment: AlignmentType.RIGHT, spaceAfter: 0 })
                  ],
                  shading: { fill: headerBgColor },
                  margins: { top: 300, bottom: 300, left: 300, right: 300 }
                })
              ]
            })
          ]
        }),

        createParagraph("", { spaceBefore: 200 }), // Spacer

        // 2. Section: DATOS GENERALES DEL PROYECTO
        createParagraph("DATOS GENERALES DEL PROYECTO", { bold: true, color: headerBgColor, fontSize: 13, spaceBefore: 200, spaceAfter: 100 }),
        
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [
            new TableRow({
              children: [
                createTableCell("Cliente contratante:", { bold: true, fontSize: 10 }),
                createTableCell("{{CLIENTE_CONTRATANTE}}", { fontSize: 10 }),
                createTableCell("País:", { bold: true, fontSize: 10 }),
                createTableCell("{{PAIS}}", { fontSize: 10 })
              ]
            }),
            new TableRow({
              children: [
                createTableCell("Ubicación:", { bold: true, fontSize: 10 }),
                createTableCell("{{UBICACION_OBRA}}", { fontSize: 10 }),
                createTableCell("Tipo de trabajo:", { bold: true, fontSize: 10 }),
                createTableCell("{{TIPO_TRABAJO}}", { fontSize: 10 })
              ]
            }),
            new TableRow({
              children: [
                createTableCell("Inicio previsto:", { bold: true, fontSize: 10 }),
                createTableCell("{{FECHA_INICIO}}", { fontSize: 10 }),
                createTableCell("Finalización prevista:", { bold: true, fontSize: 10 }),
                createTableCell("{{FECHA_FIN}}", { fontSize: 10 })
              ]
            }),
            new TableRow({
              children: [
                createTableCell("Tarifa aplicable:", { bold: true, fontSize: 10 }),
                createTableCell("{{TARIFA_APLICABLE}}", { fontSize: 10 }),
                createTableCell("Presupuesto Nº:", { bold: true, fontSize: 10 }),
                createTableCell("{{PRESUPUESTO_NUMERO}}", { fontSize: 10 })
              ]
            }),
            new TableRow({
              children: [
                createTableCell("Fecha de emisión:", { bold: true, fontSize: 10 }),
                createTableCell("{{FECHA_EMISION}}", { fontSize: 10 }),
                createTableCell("Validez:", { bold: true, fontSize: 10 }),
                createTableCell("{{VALIDEZ_PRESUPUESTO}}", { fontSize: 10 })
              ]
            })
          ]
        }),

        createParagraph("", { spaceBefore: 200 }), // Spacer

        // 3. Section: PERFILES CONTRATADOS Y TARIFAS
        createParagraph("PERFILES CONTRATADOS Y TARIFAS", { bold: true, color: headerBgColor, fontSize: 13, spaceBefore: 200, spaceAfter: 100 }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [
            // Header
            new TableRow({
              children: [
                createHeaderCell("Perfil", headerBgColor),
                createHeaderCell("Cantidad", headerBgColor, AlignmentType.CENTER),
                createHeaderCell("Tarifa por hora", headerBgColor, AlignmentType.CENTER),
                createHeaderCell("Observación", headerBgColor)
              ]
            }),
            // Loop Start Row (removed by docx-templates)
            new TableRow({
              children: [
                new TableCell({
                  children: [createParagraph("{{FOR item IN itens}}", { fontSize: 9, color: "888888", spaceAfter: 0 })],
                  columnSpan: 4,
                  margins: { top: 60, bottom: 60, left: 120, right: 120 }
                })
              ]
            }),
            // Data Row (repeated)
            new TableRow({
              children: [
                createTableCell("{{$item.funcao}}", { bold: true, fontSize: 10 }),
                createTableCell("{{$item.quantidade}}", { fontSize: 10, alignment: AlignmentType.CENTER }),
                createTableCell("{{$item.tarifa_venda}} €", { fontSize: 10, alignment: AlignmentType.CENTER }),
                createTableCell("{{$item.horas_dia}}h/día, {{$item.dias_semana}}d/sem", { fontSize: 10 })
              ]
            }),
            // Loop End Row (removed by docx-templates)
            new TableRow({
              children: [
                new TableCell({
                  children: [createParagraph("{{END-FOR item}}", { fontSize: 9, color: "888888", spaceAfter: 0 })],
                  columnSpan: 4,
                  margins: { top: 60, bottom: 60, left: 120, right: 120 }
                })
              ]
            })
          ]
        }),

        createParagraph("", { spaceBefore: 200 }), // Spacer

        // 4. Section: EQUIPOS DE PROTECCIÓN
        createParagraph("EQUIPOS DE PROTECCIÓN (EPI'S)", { bold: true, color: headerBgColor, fontSize: 13, spaceBefore: 200, spaceAfter: 100 }),
        createParagraph("{{EPI_DESCRIPCION}}", { fontSize: 10 }),
        createParagraph([
          { text: "Nota: ", bold: true },
          { text: "{{EPI_NOTA}}" }
        ], { fontSize: 10 }),

        createParagraph("", { spaceBefore: 150 }), // Spacer

        // 5. Section: CONDICIONES DE PAGO
        createParagraph("CONDICIONES DE PAGO", { bold: true, color: headerBgColor, fontSize: 13, spaceBefore: 200, spaceAfter: 100 }),
        createParagraph("Forma de pago: Transferencia bancaria.", { fontSize: 10 }),
        createParagraph([
          { text: "Plazo de pago: ", bold: true },
          { text: "{{PLAZO_PAGO}} días naturales desde la fecha de factura." }
        ], { fontSize: 10 }),

        createParagraph("", { spaceBefore: 150 }), // Spacer

        // 6. Section: OBSERVACIONES
        createParagraph("OBSERVACIONES", { bold: true, color: headerBgColor, fontSize: 13, spaceBefore: 200, spaceAfter: 100 }),
        createParagraph("{{OBSERVACIONES}}", { fontSize: 10, italic: true }),

        createParagraph("", { spaceBefore: 300 }), // Spacer

        // 7. Section: FIRMAS
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE }
          },
          rows: [
            new TableRow({
              children: [
                createTableCell([
                  createParagraph("Por EL CLIENTE", { bold: true, fontSize: 10 }),
                  createParagraph("", { spaceBefore: 400 }), // Spacer for signature
                  createParagraph("___________________________", { color: "888888", spaceAfter: 50 }),
                  createParagraph([
                    { text: "Nombre: ", bold: true },
                    { text: "{{NOMBRE_FIRMANTE_CLIENTE}}" }
                  ], { fontSize: 9, spaceAfter: 20 }),
                  createParagraph([
                    { text: "Cargo: ", bold: true },
                    { text: "{{CARGO_FIRMANTE_CLIENTE}}" }
                  ], { fontSize: 9, spaceAfter: 20 }),
                  createParagraph([
                    { text: "Empresa: ", bold: true },
                    { text: "{{EMPRESA_CLIENTE}}" }
                  ], { fontSize: 9, spaceAfter: 20 }),
                  createParagraph([
                    { text: "Email: ", bold: true },
                    { text: "{{EMAIL_FIRMANTE_CLIENTE}}" }
                  ], { fontSize: 9, spaceAfter: 0 })
                ]),
                createTableCell([
                  createParagraph("Por EL PROVEEDOR", { bold: true, fontSize: 10 }),
                  createParagraph("", { spaceBefore: 400 }), // Spacer for signature
                  createParagraph("___________________________", { color: "888888", spaceAfter: 50 }),
                  createParagraph([
                    { text: "Nombre: ", bold: true },
                    { text: "{{NOMBRE_FIRMANTE_PRESTADORA}}" }
                  ], { fontSize: 9, spaceAfter: 20 }),
                  createParagraph([
                    { text: "Cargo: ", bold: true },
                    { text: "{{CARGO_FIRMANTE_PRESTADORA}}" }
                  ], { fontSize: 9, spaceAfter: 20 }),
                  createParagraph([
                    { text: "Empresa: ", bold: true },
                    { text: "{{EMPRESA_PRESTADORA}}" }
                  ], { fontSize: 9, spaceAfter: 20 }),
                  createParagraph([
                    { text: "Email: ", bold: true },
                    { text: "{{EMAIL_PRESTADORA}}" }
                  ], { fontSize: 9, spaceAfter: 0 })
                ])
              ]
            })
          ]
        }),

        createParagraph("", { spaceBefore: 400 }), // Spacer

        // 8. Footer banner
        createParagraph(`${companyName} · Servicios especializados de mano de obra industrial · ${webSite}`, {
          italic: true,
          color: "888888",
          fontSize: 8,
          alignment: AlignmentType.CENTER
        })
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved template: ${filePath}`);
}

async function run() {
  // 1. Stocco
  // Colors: Dark Teal (#003846) & Magenta (#F20A4B)
  await generateTemplate("Stocco", "STOCCO", "003846", "F20A4B", "www.stoco.es", "modelo_presupuesto_stocco_es.docx");

  // 2. Triangulo
  // Colors: Navy (#061B55) & Orange (#F25C05)
  await generateTemplate("Triángulo Matizado", "TRIÁNGULO", "061B55", "F25C05", "www.triangulo.es", "modelo_presupuesto_triangulo_es.docx");

  // 3. Luminous
  // Colors: Charcoal (#222222) & Neon Blue (#00E5FF)
  await generateTemplate("Luminous Valley", "LUMINOUS", "222222", "00E5FF", "www.luminous.es", "modelo_presupuesto_luminous_valley_es.docx");

  // 4. Wise Services (Uwise)
  // Colors: Slate (#24343A) & Turquoise (#5FE7D4)
  await generateTemplate("Wise Services", "WISE SERVICES", "24343A", "5FE7D4", "www.uwise.es", "modelo_presupuesto_wise_services_es.docx");
}

run().catch(err => console.error(err));
