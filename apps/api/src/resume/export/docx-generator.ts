import { Injectable } from '@nestjs/common';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
  TabStopPosition,
  TabStopType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import { createLogger } from '@auto-job-apply/shared-utils';
import type { ResumeData } from './pdf-generator.js';
import type { TemplateConfig } from '@auto-job-apply/shared-types';
import { getTemplateConfig } from './template-registry.js';

const logger = createLogger({ name: 'docx-generator' });

@Injectable()
export class DocxGenerator {
  async generate(data: ResumeData, config?: TemplateConfig): Promise<Buffer> {
    const cfg = config ?? getTemplateConfig('classic', 'default');

    try {
      let children: (Paragraph | Table)[];

      if (cfg.layout === 'modern' && cfg.sidebarEnabled) {
        children = this.buildModernLayout(data, cfg);
      } else {
        children = this.buildSingleColumnLayout(data, cfg);
      }

      const doc = new Document({
        sections: [{ children }],
      });

      const buffer = await Packer.toBuffer(doc);
      return Buffer.from(buffer);
    } catch (err) {
      logger.error({ error: err }, 'DOCX generation failed');
      throw err;
    }
  }

  private buildSingleColumnLayout(data: ResumeData, cfg: TemplateConfig): Paragraph[] {
    const { typography, colors } = cfg;
    const font = this.resolveDocxFont(typography.bodyFont);
    const sections: Paragraph[] = [];

    // Header
    const headerAlign = cfg.headerAlignment === 'center' ? AlignmentType.CENTER
      : cfg.headerAlignment === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT;

    sections.push(new Paragraph({
      children: [new TextRun({ text: data.name, bold: true, size: typography.nameSizePt * 2, font, color: colors.primary.replace('#', '') })],
      alignment: headerAlign,
      spacing: { after: 100 },
    }));

    // Contact
    const contactParts = this.buildContactParts(data);
    if (contactParts.length > 0) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join(' | '), size: typography.bodySizePt * 2, color: '666666', font })],
        alignment: headerAlign,
        spacing: { after: 200 },
      }));
    }

    // Divider
    sections.push(new Paragraph({
      border: { bottom: { color: colors.divider.replace('#', ''), space: 1, style: BorderStyle.SINGLE, size: 6 } },
      spacing: { after: 200 },
    }));

    // Creative: Add colored header note (approximation in DOCX)
    if (cfg.layout === 'creative') {
      sections[0] = new Paragraph({
        children: [new TextRun({ text: data.name, bold: true, size: typography.nameSizePt * 2, font, color: 'ffffff' })],
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.SOLID, color: colors.primary.replace('#', '') },
        spacing: { after: 0 },
      });
      if (contactParts.length > 0) {
        sections[1] = new Paragraph({
          children: [new TextRun({ text: contactParts.join(' | '), size: typography.bodySizePt * 2, color: 'eeeeee', font })],
          alignment: AlignmentType.CENTER,
          shading: { type: ShadingType.SOLID, color: colors.primary.replace('#', '') },
          spacing: { after: 200 },
        });
      }
    }

    // Render sections in order
    for (const sectionId of cfg.mainSections) {
      sections.push(...this.buildSection(data, sectionId, cfg));
    }
    sections.push(...this.buildCustomSections(data, cfg));

    return sections;
  }

  private buildModernLayout(data: ResumeData, cfg: TemplateConfig): (Paragraph | Table)[] {
    const { typography, colors } = cfg;
    const font = this.resolveDocxFont(typography.bodyFont);
    const result: (Paragraph | Table)[] = [];

    // Name header full width
    result.push(new Paragraph({
      children: [new TextRun({ text: data.name, bold: true, size: typography.nameSizePt * 2, font, color: colors.primary.replace('#', '') })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }));

    const contactParts = this.buildContactParts(data);
    if (contactParts.length > 0) {
      result.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join(' | '), size: typography.bodySizePt * 2, color: '666666', font })],
        spacing: { after: 200 },
      }));
    }

    // Build sidebar paragraphs
    const sidebarParagraphs: Paragraph[] = [];
    for (const sectionId of cfg.sidebarSections) {
      sidebarParagraphs.push(...this.buildSection(data, sectionId, cfg));
    }

    // Build main paragraphs
    const mainParagraphs: Paragraph[] = [];
    for (const sectionId of cfg.mainSections) {
      mainParagraphs.push(...this.buildSection(data, sectionId, cfg));
    }
    mainParagraphs.push(...this.buildCustomSections(data, cfg));

    // Two-column table
    if (sidebarParagraphs.length > 0 || mainParagraphs.length > 0) {
      const table = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: sidebarParagraphs.length > 0 ? sidebarParagraphs : [new Paragraph('')],
                width: { size: cfg.sidebarWidthPercent, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, color: 'f5f5f5' },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                },
              }),
              new TableCell({
                children: mainParagraphs.length > 0 ? mainParagraphs : [new Paragraph('')],
                width: { size: 100 - cfg.sidebarWidthPercent, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                  bottom: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'ffffff' },
                },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });
      result.push(table);
    }

    return result;
  }

  private buildCustomSections(data: ResumeData, cfg: TemplateConfig): Paragraph[] {
    const { typography } = cfg;
    const font = this.resolveDocxFont(typography.bodyFont);
    const paragraphs: Paragraph[] = [];

    for (const section of data.customSections ?? []) {
      if (!section.items?.length) continue;
      paragraphs.push(this.sectionHeading(section.title.toUpperCase(), cfg));
      for (const item of section.items) {
        const fields = item.fields ?? [];
        if (section.type === 'paragraph') {
          const text = fields.map((f) => f.value).filter(Boolean).join(' ');
          if (text) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text, size: typography.bodySizePt * 2, font })],
              spacing: { after: 150 },
            }));
          }
        } else if (section.type === 'keyValue') {
          for (const f of fields) {
            if (!f.value) continue;
            paragraphs.push(new Paragraph({
              children: [
                ...(f.label ? [new TextRun({ text: `${f.label}: `, bold: true, size: typography.bodySizePt * 2, font })] : []),
                new TextRun({ text: f.value, size: typography.bodySizePt * 2, font }),
              ],
              spacing: { after: 80 },
            }));
          }
        } else {
          const [first, ...rest] = fields;
          if (first?.value) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: first.value, bold: true, size: typography.bodySizePt * 2, font })],
              spacing: { after: 50 },
            }));
          }
          for (const f of rest) {
            if (!f.value) continue;
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: f.label ? `${f.label}: ${f.value}` : f.value, size: typography.bodySizePt * 2, font })],
              spacing: { after: 50 },
            }));
          }
        }
      }
    }

    return paragraphs;
  }

  private buildSection(data: ResumeData, sectionId: string, cfg: TemplateConfig): Paragraph[] {
    const { typography, colors } = cfg;
    const font = this.resolveDocxFont(typography.bodyFont);
    const paragraphs: Paragraph[] = [];

    const sectionMap: Record<string, () => void> = {
      summary: () => {
        if (!data.summary) return;
        paragraphs.push(this.sectionHeading('PROFESSIONAL SUMMARY', cfg));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: data.summary, size: typography.bodySizePt * 2, font })],
          spacing: { after: 200 },
        }));
      },
      skills: () => {
        if (!data.skills?.length) return;
        paragraphs.push(this.sectionHeading('SKILLS', cfg));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: data.skills.join(', '), size: typography.bodySizePt * 2, font })],
          spacing: { after: 200 },
        }));
      },
      experience: () => {
        if (!data.experience?.length) return;
        paragraphs.push(this.sectionHeading('EXPERIENCE', cfg));
        for (const exp of data.experience) {
          const dateRange = exp.endDate ? `${exp.startDate} - ${exp.endDate}` : `${exp.startDate} - Present`;
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: exp.title, bold: true, size: (typography.bodySizePt + 1) * 2, font })],
          }));
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `${exp.company} | ${dateRange}`, size: typography.bodySizePt * 2, color: '666666', font })],
            spacing: { after: 50 },
          }));
          if (exp.description) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: exp.description, size: typography.bodySizePt * 2, font })],
              spacing: { after: 150 },
            }));
          }
        }
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      },
      education: () => {
        if (!data.education?.length) return;
        paragraphs.push(this.sectionHeading('EDUCATION', cfg));
        for (const edu of data.education) {
          const dateRange = edu.endDate ? `${edu.startDate} - ${edu.endDate}` : `${edu.startDate} - Present`;
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: edu.degree, bold: true, size: (typography.bodySizePt + 1) * 2, font })],
          }));
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({ text: `${edu.institution} | ${dateRange}`, size: typography.bodySizePt * 2, color: '666666', font }),
              ...(edu.gpa ? [new TextRun({ text: ` | GPA: ${edu.gpa}`, size: typography.bodySizePt * 2, font })] : []),
            ],
            spacing: { after: 150 },
          }));
        }
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      },
      projects: () => {
        if (!data.projects?.length) return;
        paragraphs.push(this.sectionHeading('PROJECTS', cfg));
        for (const proj of data.projects) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: proj.name, bold: true, size: (typography.bodySizePt + 1) * 2, font })],
          }));
          if (proj.description) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: proj.description, size: typography.bodySizePt * 2, font })],
            }));
          }
          if (proj.technologies?.length) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: `Technologies: ${proj.technologies.join(', ')}`, size: (typography.bodySizePt - 1) * 2, color: '666666', font })],
              spacing: { after: 150 },
            }));
          }
        }
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      },
      certifications: () => {
        if (!data.certifications?.length) return;
        paragraphs.push(this.sectionHeading('CERTIFICATIONS', cfg));
        for (const cert of data.certifications) {
          const parts = [cert.name];
          if (cert.issuer) parts.push(cert.issuer);
          if (cert.date) parts.push(cert.date);
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: parts.join(' - '), size: typography.bodySizePt * 2, font })],
            spacing: { after: 50 },
          }));
        }
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      },
      languages: () => {
        if (!data.languages?.length) return;
        paragraphs.push(this.sectionHeading('LANGUAGES', cfg));
        const langText = data.languages.map(l => l.proficiency ? `${l.language} (${l.proficiency})` : l.language).join(', ');
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: langText, size: typography.bodySizePt * 2, font })],
          spacing: { after: 200 },
        }));
      },
      publications: () => {
        if (!data.publications?.length) return;
        paragraphs.push(this.sectionHeading('PUBLICATIONS', cfg));
        for (const pub of data.publications) {
          const parts = [pub.title];
          if (pub.publisher) parts.push(pub.publisher);
          if (pub.date) parts.push(pub.date);
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: parts.join(' - '), size: typography.bodySizePt * 2, font })],
            spacing: { after: 50 },
          }));
        }
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      },
      volunteer: () => {
        if (!data.volunteer?.length) return;
        paragraphs.push(this.sectionHeading('VOLUNTEER EXPERIENCE', cfg));
        for (const vol of data.volunteer) {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: vol.role || vol.organization, bold: true, size: (typography.bodySizePt + 1) * 2, font })],
          }));
          if (vol.role) {
            const dateRange = vol.endDate ? `${vol.startDate || ''} - ${vol.endDate}` : vol.startDate || '';
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: `${vol.organization}${dateRange ? ' | ' + dateRange : ''}`, size: typography.bodySizePt * 2, color: '666666', font })],
            }));
          }
          if (vol.description) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: vol.description, size: typography.bodySizePt * 2, font })],
              spacing: { after: 150 },
            }));
          }
        }
      },
      references: () => {
        // References not rendered by default
      },
    };

    const renderFn = sectionMap[sectionId];
    if (renderFn) renderFn();

    return paragraphs;
  }

  private sectionHeading(title: string, cfg: TemplateConfig): Paragraph {
    const { typography, colors, sectionTitleStyle } = cfg;
    const font = this.resolveDocxFont(typography.headingFont);

    switch (sectionTitleStyle) {
      case 'uppercase-line':
        return new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: typography.sectionTitleSizePt * 2, font, characterSpacing: 40 })],
          border: { bottom: { color: colors.divider.replace('#', ''), space: 2, style: BorderStyle.SINGLE, size: 4 } },
          spacing: { before: 200, after: 100 },
        });

      case 'bold-colored':
        return new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: typography.sectionTitleSizePt * 2, font, color: colors.primary.replace('#', '') })],
          spacing: { before: 200, after: 100 },
        });

      case 'simple':
        return new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: typography.sectionTitleSizePt * 2, font })],
          spacing: { before: 200, after: 100 },
        });

      case 'boxed':
        return new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: typography.sectionTitleSizePt * 2, font, color: colors.primary.replace('#', '') })],
          shading: { type: ShadingType.SOLID, color: colors.primary.replace('#', '') + '15' },
          spacing: { before: 200, after: 100 },
        });

      default:
        return new Paragraph({
          children: [new TextRun({ text: title, bold: true, size: typography.sectionTitleSizePt * 2, font, characterSpacing: 40 })],
          border: { bottom: { color: '333333', space: 2, style: BorderStyle.SINGLE, size: 4 } },
          spacing: { before: 200, after: 100 },
        });
    }
  }

  private resolveDocxFont(font: string): string {
    const base = (font.split(',')[0] ?? font).replace(/['"]/g, '').trim();
    if (base === 'Helvetica' || base === 'Helvetica Neue' || base === 'Arial') return 'Calibri';
    if (base === 'Times' || base === 'Times New Roman') return 'Times New Roman';
    if (base === 'Courier' || base === 'Courier New') return 'Courier New';
    return 'Calibri';
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
