import { promises as fs } from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function dump() {
  const file = await fs.readFile('c:/Projects/dnd-dice-roller/C2codeR_163212901 (2).pdf');
  const data = new Uint8Array(file);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const annotations = await page.getAnnotations();
  
  let out = "--- TEXT CONTENT ---\n";
  for (const item of textContent.items) {
    if (item.str && item.str.trim()) {
      out += `x=${Math.round(item.transform[4])} y=${Math.round(item.transform[5])} str="${item.str}"\n`;
    }
  }

  out += "\n--- ANNOTATIONS (FORM FIELDS) ---\n";
  for (const ann of annotations) {
    if (ann.fieldValue) {
      out += `Name: ${ann.fieldName} | Value: ${ann.fieldValue}\n`;
    }
  }

  await fs.writeFile('c:/Projects/dnd-dice-roller/pdf-dump.txt', out);
  console.log("Done");
}

dump().catch(console.error);
