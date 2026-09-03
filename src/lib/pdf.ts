/**
 * PDF export. The result section is rasterised so Kannada script renders
 * exactly as it appears on screen, then paginated onto A4.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ]);

  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    backgroundColor: "#faf6ec",
    useCORS: true,
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const image = canvas.toDataURL("image/jpeg", 0.92);

  let remaining = imgH;
  let offset = 0;
  while (remaining > 0) {
    if (offset > 0) pdf.addPage();
    pdf.addImage(image, "JPEG", margin, margin - offset, imgW, imgH, undefined, "FAST");
    // Mask anything bleeding past the printable area of this page.
    pdf.setFillColor(250, 246, 236);
    pdf.rect(0, 0, pageW, margin, "F");
    pdf.rect(0, pageH - margin, pageW, margin, "F");
    remaining -= pageH - margin * 2;
    offset += pageH - margin * 2;
  }

  pdf.save(filename);
}
