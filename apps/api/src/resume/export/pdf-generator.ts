import { Injectable } from '@nestjs/common';
// @ts-ignore - pdfkit lacks type declarations
import PDFDocument from 'pdfkit';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { TemplateConfig } from '@auto-job-apply/shared-types';
import { getTemplateConfig } from './template-registry.js';

const logger = createLogger({ name: 'pdf-generator' });

export interface ResumeData {
  name: string;
  contactInfo: { email?: string; phone?: string; location?: string; linkedin?: string };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
  }>;
  projects?: Array<{ name: string; description?: string; url?: string; technologies?: string[] }>;
  certifications?: Array<{ name: string; issuer?: string; date?: string }>;
  languages?: Array<{ language: string; proficiency?: string }>;
  publications?: Array<{ title: string; publisher?: string; date?: string }>;
  volunteer?: Array<{ organization: string; role?: string; startDate?: string; endDate?: string; description?: string }>;
  customSections?: Array<{
    id: string;
    title: string;
    type?: 'list' | 'keyValue' | 'paragraph';
    items: Array<{ id: string; fields: Array<{ label: string; value: string }> }>;
  }>;
}

@Injectable()
export class PdfGenerator {
  async generate(data: ResumeData, config?: TemplateConfig): Promise<Buffer> {
    const cfg = config ?? getTemplateConfig('classic', 'default');

    return new Promise((resolve, reject) => {
      try {
        const margin = cfg.spacing.marginPt;
        const doc = new PDFDocument({ margin, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - margin * 2;
        const rightEdge = pageWidth - margin;

        if (cfg.layout === 'modern' && cfg.sidebarEnabled) {
          this.renderModernLayout(doc, data, cfg, margin, pageWidth, contentWidth);
        } else if (cfg.layout === 'creative') {
          this.renderCreativeLayout(doc, data, cfg, margin, pageWidth, contentWidth, rightEdge);
        } else {
          this.renderSingleColumnLayout(doc, data, cfg, margin, contentWidth, rightEdge);
        }

        doc.end();
      } catch (err) {
        logger.error({ error: err }, 'PDF generation failed');
        reject(err);
      }
    });
  }

  private renderSingleColumnLayout(
    doc: any, data: ResumeData, cfg: TemplateConfig,
    margin: number, contentWidth: number, rightEdge: number,
  ) {
    const { typography, colors, spacing } = cfg;
    const bodyFont = this.resolveFont(typography.bodyFont);
    const boldFont = this.resolveFont(typography.headingFont, true);

    // Header
    doc.fontSize(typography.nameSizePt).font(boldFont)
      .text(data.name, { align: cfg.headerAlignment });
    doc.moveDown(0.3);

    // Contact info
    const contactParts = this.buildContactParts(data);
    if (contactParts.length > 0) {
      doc.fontSize(typography.bodySizePt).font(bodyFont)
        .text(contactParts.join(' | '), { align: cfg.headerAlignment });
    }

    // Divider
    doc.moveDown(0.5);
    doc.moveTo(margin, doc.y).lineTo(rightEdge, doc.y).strokeColor(colors.divider).stroke();
    doc.moveDown(0.5);

    // Render all main sections in order
    for (const sectionId of cfg.mainSections) {
      this.renderSection(doc, data, sectionId, cfg, margin, rightEdge);
    }
    this.renderCustomSections(doc, data, cfg, margin, rightEdge);
  }

  private renderModernLayout(
    doc: any, data: ResumeData, cfg: TemplateConfig,
    margin: number, pageWidth: number, contentWidth: number,
  ) {
    const { typography, colors, spacing } = cfg;
    const bodyFont = this.resolveFont(typography.bodyFont);
    const boldFont = this.resolveFont(typography.headingFont, true);
    const sidebarWidth = contentWidth * (cfg.sidebarWidthPercent / 100);
    const mainWidth = contentWidth - sidebarWidth - 15; // 15pt gutter
    const sidebarX = margin;
    const mainX = margin + sidebarWidth + 15;

    // Draw sidebar background
    doc.save();
    doc.rect(0, 0, margin + sidebarWidth + 8, doc.page.height)
      .fill(colors.secondary + '0D'); // ~5% opacity
    doc.restore();

    // Header in main area
    doc.fontSize(typography.nameSizePt).font(boldFont)
      .text(data.name, mainX, margin, { width: mainWidth, align: 'left' });
    doc.moveDown(0.3);

    const contactParts = this.buildContactParts(data);
    if (contactParts.length > 0) {
      doc.fontSize(typography.bodySizePt).font(bodyFont)
        .text(contactParts.join(' | '), mainX, doc.y, { width: mainWidth });
    }

    doc.moveDown(0.5);
    const contentStartY = doc.y;

    // Render sidebar sections
    let sidebarY = contentStartY;
    doc.x = sidebarX;
    doc.y = sidebarY;
    for (const sectionId of cfg.sidebarSections) {
      doc.x = sidebarX;
      this.renderSection(doc, data, sectionId, cfg, sidebarX, sidebarX + sidebarWidth, sidebarWidth);
    }

    // Render main sections
    doc.x = mainX;
    doc.y = contentStartY;
    for (const sectionId of cfg.mainSections) {
      doc.x = mainX;
      this.renderSection(doc, data, sectionId, cfg, mainX, mainX + mainWidth, mainWidth);
    }
  }

  private renderCreativeLayout(
    doc: any, data: ResumeData, cfg: TemplateConfig,
    margin: number, pageWidth: number, contentWidth: number, rightEdge: number,
  ) {
    const { typography, colors } = cfg;
    const bodyFont = this.resolveFont(typography.bodyFont);
    const boldFont = this.resolveFont(typography.headingFont, true);

    // Colored header band
    const bandHeight = 70;
    doc.save();
    doc.rect(0, 0, pageWidth, bandHeight).fill(colors.primary);
    doc.restore();

    // Name on the band (white text)
    doc.fontSize(typography.nameSizePt).font(boldFont).fillColor('#ffffff')
      .text(data.name, margin, 18, { align: 'center', width: contentWidth });

    // Contact on the band
    const contactParts = this.buildContactParts(data);
    if (contactParts.length > 0) {
      doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor('#ffffffcc')
        .text(contactParts.join(' | '), margin, doc.y, { align: 'center', width: contentWidth });
    }

    // Reset color and position
    doc.fillColor(colors.text);
    doc.y = bandHeight + 15;
    doc.x = margin;

    // Render all sections
    for (const sectionId of cfg.mainSections) {
      this.renderSection(doc, data, sectionId, cfg, margin, rightEdge);
    }
    this.renderCustomSections(doc, data, cfg, margin, rightEdge);
  }

  private renderCustomSections(
    doc: any, data: ResumeData, cfg: TemplateConfig,
    leftEdge: number, rightEdge: number, width?: number,
  ) {
    if (!data.customSections?.length) return;
    const { typography, spacing } = cfg;
    const bodyFont = this.resolveFont(typography.bodyFont);
    const boldFont = this.resolveFont(typography.headingFont, true);
    const textWidth = width ?? (rightEdge - leftEdge);

    for (const section of data.customSections) {
      if (!section.items?.length) continue;
      this.sectionTitle(doc, section.title, cfg, leftEdge, rightEdge);
      for (const item of section.items) {
        const fields = item.fields ?? [];
        if (section.type === 'paragraph') {
          const text = fields.map((f) => f.value).filter(Boolean).join(' ');
          if (text) doc.fontSize(typography.bodySizePt).font(bodyFont).text(text, leftEdge, doc.y, { width: textWidth });
        } else if (section.type === 'keyValue') {
          for (const f of fields) {
            if (!f.value) continue;
            doc.fontSize(typography.bodySizePt).font(boldFont).text(f.label ? `${f.label}: ` : '', leftEdge, doc.y, { continued: Boolean(f.label), width: textWidth });
            doc.font(bodyFont).text(f.value, { width: textWidth });
          }
        } else {
          const [first, ...rest] = fields;
          if (first?.value) doc.fontSize(typography.bodySizePt).font(boldFont).text(first.value, leftEdge, doc.y, { width: textWidth });
          for (const f of rest) {
            if (!f.value) continue;
            doc.fontSize(typography.bodySizePt).font(bodyFont).text(f.label ? `${f.label}: ${f.value}` : f.value, leftEdge, doc.y, { width: textWidth });
          }
        }
        doc.moveDown(0.4);
      }
      doc.moveDown(spacing.sectionGapPt / 12);
    }
  }

  private renderSection(
    doc: any, data: ResumeData, sectionId: string, cfg: TemplateConfig,
    leftEdge: number, rightEdge: number, width?: number,
  ) {
    const { typography, colors, spacing } = cfg;
    const bodyFont = this.resolveFont(typography.bodyFont);
    const boldFont = this.resolveFont(typography.headingFont, true);
    const textWidth = width ?? (rightEdge - leftEdge);

    const sectionMap: Record<string, () => void> = {
      summary: () => {
        if (!data.summary) return;
        this.sectionTitle(doc, 'Professional Summary', cfg, leftEdge, rightEdge);
        doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
          .text(data.summary, leftEdge, doc.y, { width: textWidth, lineGap: 2 });
        doc.moveDown(spacing.sectionGapPt / 12);
      },
      skills: () => {
        if (!data.skills?.length) return;
        this.sectionTitle(doc, 'Skills', cfg, leftEdge, rightEdge);
        doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
          .text(data.skills.join(', '), leftEdge, doc.y, { width: textWidth, lineGap: 2 });
        doc.moveDown(spacing.sectionGapPt / 12);
      },
      experience: () => {
        if (!data.experience?.length) return;
        this.sectionTitle(doc, 'Experience', cfg, leftEdge, rightEdge);
        for (const exp of data.experience) {
          doc.fontSize(typography.bodySizePt + 1).font(boldFont).fillColor(colors.text)
            .text(exp.title, leftEdge, doc.y, { width: textWidth });
          const dateRange = exp.endDate ? `${exp.startDate} - ${exp.endDate}` : `${exp.startDate} - Present`;
          doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor('#666666')
            .text(`${exp.company} | ${dateRange}`, leftEdge, doc.y, { width: textWidth });
          if (exp.description) {
            doc.moveDown(0.2);
            doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
              .text(exp.description, leftEdge, doc.y, { width: textWidth, lineGap: 2 });
          }
          doc.moveDown(spacing.entryGapPt / 12);
        }
        doc.moveDown(0.3);
      },
      education: () => {
        if (!data.education?.length) return;
        this.sectionTitle(doc, 'Education', cfg, leftEdge, rightEdge);
        for (const edu of data.education) {
          doc.fontSize(typography.bodySizePt + 1).font(boldFont).fillColor(colors.text)
            .text(edu.degree, leftEdge, doc.y, { width: textWidth });
          const dateRange = edu.endDate ? `${edu.startDate} - ${edu.endDate}` : `${edu.startDate} - Present`;
          doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
            .text(`${edu.institution} | ${dateRange}`, leftEdge, doc.y, { width: textWidth });
          if (edu.gpa) doc.fontSize(typography.bodySizePt).text(`GPA: ${edu.gpa}`, leftEdge, doc.y, { width: textWidth });
          doc.moveDown(spacing.entryGapPt / 12);
        }
        doc.moveDown(0.3);
      },
      projects: () => {
        if (!data.projects?.length) return;
        this.sectionTitle(doc, 'Projects', cfg, leftEdge, rightEdge);
        for (const proj of data.projects) {
          doc.fontSize(typography.bodySizePt + 1).font(boldFont).fillColor(colors.text)
            .text(proj.name, leftEdge, doc.y, { width: textWidth });
          if (proj.description) doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
            .text(proj.description, leftEdge, doc.y, { width: textWidth });
          if (proj.technologies?.length) doc.fontSize(typography.bodySizePt - 1).font(bodyFont).fillColor('#666666')
            .text(`Tech: ${proj.technologies.join(', ')}`, leftEdge, doc.y, { width: textWidth });
          if (proj.url) doc.fontSize(typography.bodySizePt - 1).font(bodyFont).fillColor(colors.accent)
            .text(proj.url, leftEdge, doc.y, { width: textWidth });
          doc.moveDown(spacing.entryGapPt / 12);
        }
        doc.moveDown(0.3);
      },
      certifications: () => {
        if (!data.certifications?.length) return;
        this.sectionTitle(doc, 'Certifications', cfg, leftEdge, rightEdge);
        for (const cert of data.certifications) {
          const parts = [cert.name];
          if (cert.issuer) parts.push(cert.issuer);
          if (cert.date) parts.push(cert.date);
          doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
            .text(parts.join(' - '), leftEdge, doc.y, { width: textWidth });
        }
        doc.moveDown(spacing.sectionGapPt / 12);
      },
      languages: () => {
        if (!data.languages?.length) return;
        this.sectionTitle(doc, 'Languages', cfg, leftEdge, rightEdge);
        const langText = data.languages.map(l => l.proficiency ? `${l.language} (${l.proficiency})` : l.language).join(', ');
        doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
          .text(langText, leftEdge, doc.y, { width: textWidth });
        doc.moveDown(spacing.sectionGapPt / 12);
      },
      publications: () => {
        if (!data.publications?.length) return;
        this.sectionTitle(doc, 'Publications', cfg, leftEdge, rightEdge);
        for (const pub of data.publications) {
          const parts = [pub.title];
          if (pub.publisher) parts.push(pub.publisher);
          if (pub.date) parts.push(pub.date);
          doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
            .text(parts.join(' - '), leftEdge, doc.y, { width: textWidth });
        }
        doc.moveDown(spacing.sectionGapPt / 12);
      },
      volunteer: () => {
        if (!data.volunteer?.length) return;
        this.sectionTitle(doc, 'Volunteer Experience', cfg, leftEdge, rightEdge);
        for (const vol of data.volunteer) {
          doc.fontSize(typography.bodySizePt + 1).font(boldFont).fillColor(colors.text)
            .text(vol.role || vol.organization, leftEdge, doc.y, { width: textWidth });
          if (vol.role) {
            const dateRange = vol.endDate ? `${vol.startDate || ''} - ${vol.endDate}` : vol.startDate || '';
            doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
              .text(`${vol.organization}${dateRange ? ' | ' + dateRange : ''}`, leftEdge, doc.y, { width: textWidth });
          }
          if (vol.description) doc.fontSize(typography.bodySizePt).font(bodyFont).fillColor(colors.text)
            .text(vol.description, leftEdge, doc.y, { width: textWidth });
          doc.moveDown(spacing.entryGapPt / 12);
        }
      },
      references: () => {
        // References not rendered in PDF by default
      },
    };

    const renderFn = sectionMap[sectionId];
    if (renderFn) renderFn();
  }

  private sectionTitle(doc: any, title: string, cfg: TemplateConfig, leftEdge: number, rightEdge: number) {
    const { typography, colors, sectionTitleStyle } = cfg;
    const boldFont = this.resolveFont(typography.headingFont, true);

    doc.fillColor(colors.text);

    switch (sectionTitleStyle) {
      case 'uppercase-line':
        doc.fontSize(typography.sectionTitleSizePt).font(boldFont)
          .text(title.toUpperCase(), leftEdge, doc.y, { characterSpacing: 1 });
        doc.moveTo(leftEdge, doc.y + 2).lineTo(rightEdge, doc.y + 2)
          .strokeColor(colors.divider).lineWidth(0.5).stroke();
        doc.moveDown(0.4);
        break;

      case 'bold-colored':
        doc.fontSize(typography.sectionTitleSizePt).font(boldFont).fillColor(colors.primary)
          .text(title, leftEdge, doc.y);
        doc.fillColor(colors.text);
        doc.moveDown(0.3);
        break;

      case 'simple':
        doc.fontSize(typography.sectionTitleSizePt).font(boldFont)
          .text(title, leftEdge, doc.y);
        doc.moveDown(0.3);
        break;

      case 'boxed':
        const boxY = doc.y;
        const textHeight = typography.sectionTitleSizePt + 6;
        doc.save();
        doc.rect(leftEdge, boxY, rightEdge - leftEdge, textHeight)
          .fill(colors.primary + '15'); // ~8% opacity
        doc.restore();
        doc.fontSize(typography.sectionTitleSizePt).font(boldFont).fillColor(colors.primary)
          .text(title, leftEdge + 6, boxY + 3);
        doc.fillColor(colors.text);
        doc.y = boxY + textHeight + 4;
        break;
    }
  }

  private resolveFont(font: string, bold = false): string {
    // Map font names to PDFKit built-in fonts
    const base = (font.split(',')[0] ?? font).replace(/['"]/g, '').trim();
    if (base === 'Helvetica' || base === 'Helvetica Neue' || base === 'Arial') {
      return bold ? 'Helvetica-Bold' : 'Helvetica';
    }
    if (base === 'Times' || base === 'Times New Roman') {
      return bold ? 'Times-Bold' : 'Times-Roman';
    }
    if (base === 'Courier' || base === 'Courier New') {
      return bold ? 'Courier-Bold' : 'Courier';
    }
    return bold ? 'Helvetica-Bold' : 'Helvetica';
  }

  private buildContactParts(data: ResumeData): string[] {
    const parts: string[] = [];
    if (data.contactInfo.email) parts.push(data.contactInfo.email);
    if (data.contactInfo.phone) parts.push(data.contactInfo.phone);
    if (data.contactInfo.location) parts.push(data.contactInfo.location);
    if (data.contactInfo.linkedin) parts.push(data.contactInfo.linkedin);
    return parts;
  }
}
