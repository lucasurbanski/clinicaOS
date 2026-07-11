import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PrescriptionPdfData = {
  clinicName: string;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  patientName: string;
  content: string;
  doctorName?: string | null;
  doctorCrm?: string | null;
  dateStr: string;
};

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of String(text).split("\n")) {
    const words = raw.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (line && font.widthOfTextAtSize(test, size) > maxWidth) { out.push(line); line = w; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function generatePrescriptionPdf(d: PrescriptionPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  const gray = rgb(0.4, 0.4, 0.4);
  const dark = rgb(0.1, 0.1, 0.1);
  let y = height - margin;

  // Cabeçalho da clínica
  page.drawText(d.clinicName, { x: margin, y, size: 18, font: bold, color: dark });
  y -= 18;
  const sub = [d.clinicAddress, d.clinicPhone].filter(Boolean).join("  ·  ");
  if (sub) { page.drawText(sub, { x: margin, y, size: 9, font, color: gray }); y -= 6; }
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 28;

  // Título
  page.drawText("RECEITUÁRIO", { x: margin, y, size: 13, font: bold, color: dark });
  page.drawText(d.dateStr, { x: width - margin - font.widthOfTextAtSize(d.dateStr, 10), y: y + 1, size: 10, font, color: gray });
  y -= 24;

  // Paciente
  page.drawText("Paciente: ", { x: margin, y, size: 11, font: bold, color: dark });
  page.drawText(d.patientName, { x: margin + bold.widthOfTextAtSize("Paciente: ", 11), y, size: 11, font, color: dark });
  y -= 24;

  // Corpo (prescrição)
  const bodySize = 12;
  for (const line of wrap(d.content || "", font, bodySize, contentWidth)) {
    if (y < 140) { y = height - margin; pdf.addPage([595.28, 841.89]); } // simples: nova página se estourar
    page.drawText(line, { x: margin, y, size: bodySize, font, color: dark });
    y -= bodySize + 6;
  }

  // Rodapé: assinatura + médico
  const footerY = 110;
  page.drawLine({ start: { x: width / 2 - 110, y: footerY }, end: { x: width / 2 + 110, y: footerY }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  const docLine = [d.doctorName, d.doctorCrm].filter(Boolean).join(" — ") || "Médico responsável";
  page.drawText(docLine, { x: width / 2 - font.widthOfTextAtSize(docLine, 10) / 2, y: footerY - 14, size: 10, font, color: dark });
  page.drawText("Assinatura", { x: width / 2 - font.widthOfTextAtSize("Assinatura", 8) / 2, y: footerY + 4, size: 8, font, color: gray });

  return pdf.save();
}
