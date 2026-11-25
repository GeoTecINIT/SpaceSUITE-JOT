/// <reference lib="webworker" />

import jsPDF from 'jspdf';
import { JobOffer } from '../models/jobOffer';
import { Competence } from '../models/occupationalProfile';
import { PdfWorkerPayload } from '../models/pdfWorkerPayload';

addEventListener('message', ({ data }: { data: PdfWorkerPayload }) => {
  const { offer, assets, scaleFactor } = data;
  const doc = new jsPDF();

  if (!assets.watermark) assets.watermark = '';

  addWatermark(doc, assets.watermark);
  let y = 25;

  if (assets.poppinsRegular) {
    doc.addFileToVFS('Poppins-Regular.ttf', assets.poppinsRegular);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
  }

  if (assets.poppinsBold) {
    doc.addFileToVFS('Poppins-Bold.ttf', assets.poppinsBold);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
  }

  if (assets.poppinsItalic) {
    doc.addFileToVFS('Poppins-Italic.ttf', assets.poppinsItalic);
    doc.addFont('Poppins-Italic.ttf', 'Poppins', 'italic');
  }

  doc.setLineHeightFactor(scaleFactor);

  applyMetadata(doc, offer);
  y = renderHeader(doc, offer, y, assets);
  y = renderSummary(doc, offer, y, assets);
  y = renderDomains(doc, offer, y, assets);
  y = renderKnowledge(doc, offer, y, assets);
  y = renderSkills(doc, offer, y, assets);
  y = renderTransversalSkills(doc, offer, y, assets);
  y = renderDatasets(doc, offer, y, assets);
  y = renderTools(doc, offer, y, assets);
  y = renderLanguages(doc, offer, y, assets);
  y = renderContactDetails(doc, offer, y, assets);
  y = renderAdditionalInfo(doc, offer, y, assets);
  renderFooter(doc, assets);

  const blob = doc.output('blob');

  postMessage({
    blob,
    filename: buildFilename(offer),
  });
});

/* ============================
    METADATA
============================ */

function applyMetadata(doc: jsPDF, offer: JobOffer): void {
  doc.setProperties({
    title: `${offer.title} – Job Offer`,
    subject: getSubjectMetadata(offer),
    author: 'SpaceSuite',
    creator: 'SpaceSuite Job Offer Tool',
    keywords: 'spacesuite, job offer',
  });
}

function getSubjectMetadata(offer: JobOffer): string {
  let subject = `@prefix dc: <http://purl.org/dc/terms/> . @prefix eo4geo: <http://bok.eo4geo.eu/> . <> dc:type "Job Offer"; <> dc:title "${offer.title}"`;

  offer.knowledge.forEach((concept) => {
    const bokCode = concept.match(/^\[([^\]]+)\]/);

    if (bokCode) subject = subject + '; dc:relation eo4geo:' + bokCode[1];
  });

  subject = subject + ' .';

  return subject;
}

/* ============================
    HEADER
============================ */

function renderHeader(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  doc.setFontSize(26).setFont('Poppins', 'bold');
  doc.setTextColor('#0e145d');

  const lines = doc.splitTextToSize(j.title, 170);
  const linesSize = lines.length * 10.4 * 1.35;
  y = checkEnd(doc, y, linesSize, assets);

  doc.text(lines, 20, y);

  y += linesSize;

  doc.setFontSize(10).setFont('Poppins', 'normal');

  doc.text(
    [
      (j.createdAt as Date)
        ? `Created: ${j.createdAt.toLocaleDateString()}`
        : null,
      (j.updatedAt as Date)
        ? `Updated: ${j.updatedAt.toLocaleDateString()}`
        : null,
    ]
      .filter(Boolean)
      .join(' | '),
    20,
    y,
  );

  y += 4 * 1.35;

  const infoData = [
    j.orgName,
    j.division ?? null,
    'EQF ' + j.eqf,
    'Required experience: ' + j.yearsExperience + ' years',
    j.salaryMax != 0 && j.salaryMin != 0
      ? 'Annual salary range: ' +
        j.salaryMin +
        ' - ' +
        j.salaryMax +
        ' ' +
        j.currency
      : null,
    j.location !== '' ? 'Location: ' + j.location : null,
    j.dedication != '' ? 'Dedication: ' + j.dedication : null,
    j.typeContract != '' ? 'Contract type: ' + j.typeContract : null,
    'Ask for motivation letter? ' + (j.motivationLetter ? 'Yes' : 'No'),
  ]
    .filter(Boolean)
    .join(' | ');

  const infoLines = doc.splitTextToSize(infoData, 170);
  const infoLinesSize = infoLines.length * 4 * 1.35;
  y = checkEnd(doc, y, infoLinesSize, assets);

  doc.text(infoLines, 20, y);

  y += infoLinesSize;

  return y;
}

/* ============================
  FOOTER
============================ */

function renderFooter(
  doc: jsPDF,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
  y = 275,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerHeight = doc.internal.pageSize.getHeight() - y;

  doc.setFillColor('#0e145d');
  doc.rect(0, y, pageWidth, footerHeight, 'F');

  const page = doc.getCurrentPageInfo().pageNumber;

  doc.setFontSize(9).setFont('Poppins', 'normal');
  doc.setTextColor('#ffffff');
  doc.text(page.toString(), pageWidth / 2, y + footerHeight / 2 + 1); // + 1
  doc.setFontSize(10).setFont('Poppins', 'normal');
  doc.setTextColor('#0e145d');

  if (assets.euLogo) {
    const props = doc.getImageProperties(assets.euLogo);
    const imgWidthPx = props.width;
    const imgHeightPx = props.height;
    const targetWidth = 30;
    const ratio = imgHeightPx / imgWidthPx;
    const targetHeight = targetWidth * ratio;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.addImage(
      assets.euLogo,
      'PNG',
      pageWidth - targetWidth - 20,
      y + footerHeight / 2 - targetHeight / 2,
      targetWidth,
      targetHeight,
      undefined,
      'FAST',
    );
  }

  if (assets.spaceSuiteLogo) {
    const props = doc.getImageProperties(assets.spaceSuiteLogo);
    const imgWidthPx = props.width;
    const imgHeightPx = props.height;
    const targetWidth = 30;
    const ratio = imgHeightPx / imgWidthPx;
    const targetHeight = targetWidth * ratio;

    doc.addImage(
      assets.spaceSuiteLogo,
      'PNG',
      20,
      y + footerHeight / 2 - targetHeight / 2,
      targetWidth,
      targetHeight,
      undefined,
      'FAST',
    );
  }
}

/* ============================
    SUMMARY
============================ */

function renderSummary(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  y = sectionTitle(doc, 'Summary', y, assets);
  y += 4 * 1.35;

  const lines = doc.splitTextToSize(j.description, 170);
  const linesSize = lines.length * 4 * 1.35;
  y = checkEnd(doc, y, linesSize, assets);

  doc.text(lines, 20, y);

  y += linesSize;

  return y;
}

/* ============================
    APPLICATION DOMAINS
============================ */

function renderDomains(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.fields.length) return y;

  y = sectionTitle(doc, 'Required Application Domains', y, assets);
  y += 4 * 1.35;

  const domains: string[] = j.fields.map(
    (field) => field.name + ' (' + field.grandparent + ')',
  );

  domains.forEach((domain) => {
    const lines = doc.splitTextToSize(domain, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    Contact details
============================ */

function renderContactDetails(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.contactDetails) return y;

  y = sectionTitle(doc, 'Contact Details', y, assets);
  y += 4 * 1.35;

  const lines = doc.splitTextToSize(j.contactDetails, 170);
  const linesSize = lines.length * 4 * 1.35;
  y = checkEnd(doc, y, linesSize, assets);

  doc.text(lines, 20, y);

  y += linesSize;

  return y;
}

/* ============================
    Additional Info
============================ */

function renderAdditionalInfo(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.additionalQuestions) return y;

  y = sectionTitle(doc, 'Additional Information/Questions', y, assets);
  y += 4 * 1.35;

  const lines = doc.splitTextToSize(j.additionalQuestions, 170);
  const linesSize = lines.length * 4 * 1.35;
  y = checkEnd(doc, y, linesSize, assets);

  doc.text(lines, 20, y);

  y += linesSize;

  return y;
}

/* ============================
    KNOWLEDGE
============================ */

function renderKnowledge(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  y = sectionTitle(doc, 'Required Knowledge', y, assets);
  y += 4 * 1.35;

  j.knowledge.forEach((concept) => {
    const lines = doc.splitTextToSize(concept, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    const match = concept.match(/^\[([^\]]+)\]/);

    if (match) {
      doc.setTextColor('#3fb3f8');
      doc.textWithLink(lines, 20, y, {
        url: 'https://geospacebok.eu/' + match[1],
      });
      doc.setTextColor('#0e145d');
    } else doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    SKILLS
============================ */

function renderSkills(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  y = sectionTitle(doc, 'Required Skills', y, assets);
  y += 4 * 1.35;

  const totalSkills = j.skills
    .map((skill) => skill.label)
    .concat(j.customSkills);

  totalSkills.forEach((skill) => {
    const lines = doc.splitTextToSize(skill, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i === 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    TRANSVERSAL SKILLS
============================ */

function renderTransversalSkills(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.competences.length && !j.customCompetences.length) return y;

  y = sectionTitle(doc, 'Required Transversal Skills', y, assets);
  y += 4 * 1.35;

  const totalSkills: Competence[] = j.competences.concat(
    j.customCompetences.map((custom) => {
      return { preferredLabel: custom };
    }),
  );

  totalSkills.forEach((skill) => {
    const lines = doc.splitTextToSize(skill.preferredLabel, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    if (skill.uri) {
      doc.setTextColor('#3fb3f8');
      doc.textWithLink(lines, 20, y, { url: skill.uri });
      doc.setTextColor('#0e145d');
    } else doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    Languages
============================ */

function renderLanguages(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.languages.length) return y;

  y = sectionTitle(doc, 'Required Languages', y, assets);
  y += 4 * 1.35;

  j.languages.forEach((language) => {
    const lines = doc.splitTextToSize(language.name, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    Datasets
============================ */

function renderDatasets(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.dataRequired.length) return y;

  y = sectionTitle(doc, 'Required Datasets Knowledge', y, assets);
  y += 4 * 1.35;

  j.dataRequired.forEach((dataset) => {
    const lines = doc.splitTextToSize(dataset.name, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    if (dataset.url) {
      doc.setTextColor('#3fb3f8');
      doc.textWithLink(lines, 20, y, { url: dataset.url });
      doc.setTextColor('#0e145d');
    } else doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    Tools
============================ */

function renderTools(
  doc: jsPDF,
  j: JobOffer,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (!j.toolsRequired.length) return y;

  y = sectionTitle(doc, 'Required Tools Knowledge', y, assets);
  y += 4 * 1.35;

  j.toolsRequired.forEach((tool) => {
    const lines = doc.splitTextToSize(tool.name, 170);

    for (let i = 0; i < lines.length; i++) {
      if (i == 0) lines[i] = '• ' + lines[i];
      else lines[i] = '   ' + lines[i];
    }

    const linesSize = lines.length * 4 * 1.35;
    y = checkEnd(doc, y, linesSize, assets);

    if (tool.url) {
      doc.setTextColor('#3fb3f8');
      doc.textWithLink(lines, 20, y, { url: tool.url });
      doc.setTextColor('#0e145d');
    } else doc.text(lines, 20, y);

    y += linesSize;
  });

  return y;
}

/* ============================
    HELPERS
============================ */

function sectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  y += 8 * 1.35;
  y = checkEnd(doc, y, 0, assets);

  doc.setFontSize(14).setFont('Poppins', 'bold');
  doc.setTextColor('#0e145d');
  doc.text(title, 20, y);
  doc.setFontSize(10).setFont('Poppins', 'normal');
  doc.setTextColor('#0e145d');

  return y + 2 * 1.35;
}

function checkEnd(
  doc: jsPDF,
  y: number,
  contentSize: number = 0,
  assets: {
    poppinsRegular?: string | undefined;
    poppinsBold?: string | undefined;
    poppinsItalic?: string | undefined;
    watermark?: string | undefined;
    euLogo?: string | undefined;
    spaceSuiteLogo?: string | undefined;
  },
): number {
  if (y + contentSize > 270) {
    renderFooter(doc, assets);
    doc.addPage();
    addWatermark(doc, assets.watermark || '');

    return 20;
  }

  return y;
}

function addWatermark(doc: jsPDF, watermark: string): void {
  if (watermark) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.addImage(
      watermark,
      'PNG',
      0,
      0,
      pageWidth,
      pageHeight,
      undefined,
      'FAST',
    );
  }
}

function buildFilename(j: JobOffer): string {
  return `${j.title.replace(/\s+/g, '_')}_Job_Offer.pdf`;
}
