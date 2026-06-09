const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');

async function run() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun("Hello World"),
          ],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("test.docx", buffer);
  console.log("Successfully generated test.docx!");
}

run().catch(err => console.error(err));
