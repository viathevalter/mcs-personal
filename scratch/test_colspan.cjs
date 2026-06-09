const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require('docx');
const fs = require('fs');

async function run() {
  const doc = new Document({
    sections: [{
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph("Spanned Cell")],
                  columnSpan: 2
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("C1")] }),
                new TableCell({ children: [new Paragraph("C2")] })
              ]
            })
          ]
        })
      ]
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("test_colspan.docx", buffer);
  console.log("Successfully generated test_colspan.docx!");
}

run().catch(err => console.error(err));
