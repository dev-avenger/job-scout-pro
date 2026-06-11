import type { CSSProperties, FocusEvent, ReactNode } from 'react';
import type { CustomSection, TemplateConfig } from '@auto-job-apply/shared-types';
import { SECTION_LABELS, isCustomSectionId, customSectionUuid } from '@auto-job-apply/shared-types';
import type { ResumeRenderData } from './types.js';

export interface SectionRenderContext {
  data: ResumeRenderData;
  config: TemplateConfig;
  /** items inside the section flow in 1–3 columns */
  columns?: number;
  /** Europass-style: title in a left gutter, content on the right */
  labelLeft?: boolean;
  /** inline WYSIWYG editing: called with a profile field path on blur */
  onFieldEdit?: (path: string, value: string) => void;
}

const body = (config: TemplateConfig): CSSProperties => ({
  fontFamily: config.typography.bodyFont,
  fontSize: `${config.typography.bodySizePt}pt`,
  lineHeight: config.typography.lineHeight,
});

const heading = (config: TemplateConfig): CSSProperties => ({
  fontFamily: config.typography.headingFont,
  fontSize: `${config.typography.bodySizePt}pt`,
  fontWeight: 700,
});

const muted = (config: TemplateConfig): CSSProperties => ({
  ...body(config),
  color: '#6b7280',
});

export function SectionTitle({ title, config }: { title: string; config: TemplateConfig }) {
  const base: CSSProperties = {
    fontFamily: config.typography.headingFont,
    fontSize: `${config.typography.sectionTitleSizePt}pt`,
    fontWeight: 700,
  };

  switch (config.sectionTitleStyle) {
    case 'uppercase-line':
      return (
        <div style={{ marginBottom: '6px' }}>
          <h3 style={{ ...base, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
          <div style={{ height: '1px', marginTop: '2px', backgroundColor: config.colors.divider }} />
        </div>
      );
    case 'bold-colored':
      return <h3 style={{ ...base, color: config.colors.primary, marginBottom: '6px' }}>{title}</h3>;
    case 'boxed':
      return (
        <div
          style={{
            padding: '2px 6px',
            marginBottom: '6px',
            borderRadius: '2px',
            backgroundColor: `${config.colors.primary}15`,
          }}
        >
          <h3 style={{ ...base, color: config.colors.primary }}>{title}</h3>
        </div>
      );
    case 'simple':
    default:
      return <h3 style={{ ...base, marginBottom: '6px' }}>{title}</h3>;
  }
}

/** Width of the Europass-style label gutter */
export const LABEL_GUTTER_WIDTH = '26%';

/** Style of the blue uppercase labels in the Europass-style left gutter */
const labelLeftTitle = (config: TemplateConfig): CSSProperties => ({
  fontFamily: config.typography.headingFont,
  fontSize: `${config.typography.sectionTitleSizePt - 1}pt`,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: config.colors.primary,
  lineHeight: 1.25,
});

const gutterStyle: CSSProperties = {
  width: LABEL_GUTTER_WIDTH,
  flexShrink: 0,
  paddingRight: '14px',
  textAlign: 'right',
};

function columnsStyle(columns?: number): CSSProperties {
  if (!columns || columns <= 1) return {};
  return { columnCount: columns, columnGap: '18px' };
}

type SectionStyleCtx = Pick<SectionRenderContext, 'config' | 'columns' | 'labelLeft' | 'onFieldEdit'>;

/**
 * Plain text when read-only; a contentEditable element when the context
 * provides onFieldEdit. SSR-safe (contentEditable is just an attribute).
 */
function EditableText({
  path,
  value,
  style,
  ctx,
  block = true,
}: {
  path: string;
  value: string;
  style?: CSSProperties;
  ctx: Pick<SectionRenderContext, 'onFieldEdit'>;
  block?: boolean;
}) {
  const { onFieldEdit } = ctx;
  if (!onFieldEdit) {
    return block ? <p style={style}>{value}</p> : <span style={style}>{value}</span>;
  }
  const editableStyle: CSSProperties = { ...style, outline: 'none', cursor: 'text' };
  const handleBlur = (e: FocusEvent<HTMLElement>) => onFieldEdit(path, e.currentTarget.textContent ?? '');
  return block ? (
    <p contentEditable suppressContentEditableWarning style={editableStyle} onBlur={handleBlur}>
      {value}
    </p>
  ) : (
    <span contentEditable suppressContentEditableWarning style={editableStyle} onBlur={handleBlur}>
      {value}
    </span>
  );
}

function Section({ title, ctx, children }: { title: string; ctx: SectionStyleCtx; children: ReactNode }) {
  const { config, columns, labelLeft } = ctx;

  if (labelLeft) {
    // Europass-style row: blue uppercase label in the left gutter, content right,
    // thin rule across the top of each section row.
    return (
      <div
        style={{
          display: 'flex',
          marginBottom: `${config.spacing.sectionGapPt}pt`,
          borderTop: `1px solid ${config.colors.divider}`,
          paddingTop: '7px',
        }}
      >
        <div style={gutterStyle}>
          <h3 style={labelLeftTitle(config)}>{title}</h3>
        </div>
        <div style={{ flex: 1, minWidth: 0, ...columnsStyle(columns) }}>{children}</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: `${config.spacing.sectionGapPt}pt` }}>
      <SectionTitle title={title} config={config} />
      <div style={columnsStyle(columns)}>{children}</div>
    </div>
  );
}

const entryGap = (config: TemplateConfig): CSSProperties => ({
  marginBottom: `${config.spacing.entryGapPt}pt`,
  breakInside: 'avoid',
});

/* ------------------------------ built-ins -------------------------------- */

function SummarySection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.summary) return null;
  return (
    <Section title={ctx.labelLeft ? 'Profile' : 'Professional Summary'} ctx={ctx}>
      <EditableText path="summary" value={data.summary} style={body(config)} ctx={ctx} />
    </Section>
  );
}

function SkillsSection(ctx: SectionRenderContext) {
  const { data, config, columns } = ctx;
  if (!data.skills.length) return null;
  return (
    <Section title="Skills" ctx={ctx}>
      {columns && columns > 1 ? (
        data.skills.map((skill, i) => (
          <EditableText
            key={i}
            path={`skills.${i}`}
            value={skill}
            style={{ ...body(config), breakInside: 'avoid' }}
            ctx={ctx}
          />
        ))
      ) : (
        <EditableText path="skills" value={data.skills.join(', ')} style={body(config)} ctx={ctx} />
      )}
    </Section>
  );
}

function dateRange(start?: string, end?: string, current?: boolean): string {
  if (!start && !end) return '';
  if (current || !end) return `${start ?? ''} - Present`;
  return `${start ?? ''} - ${end}`;
}

function ExperienceSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.experience.length) return null;

  const entryBody = (exp: ResumeRenderData['experience'][number], i: number) =>
    exp.bullets.length > 0 ? (
      <ul style={{ ...body(config), paddingLeft: '14px', marginTop: '2px' }}>
        {exp.bullets.map((b, j) => (
          <li key={j}>
            <EditableText block={false} path={`experience.${i}.bullets.${j}`} value={b} ctx={ctx} />
          </li>
        ))}
      </ul>
    ) : exp.description ? (
      <EditableText
        path={`experience.${i}.description`}
        value={exp.description}
        style={{ ...body(config), marginTop: '2px' }}
        ctx={ctx}
      />
    ) : null;

  if (ctx.labelLeft) {
    // Europass-style: the section label sits in the gutter above the first
    // entry's date range; subsequent entries only show their dates there.
    return (
      <div
        style={{
          marginBottom: `${config.spacing.sectionGapPt}pt`,
          borderTop: `1px solid ${config.colors.divider}`,
          paddingTop: '7px',
        }}
      >
        {data.experience.map((exp, i) => (
          <div key={i} style={{ display: 'flex', ...entryGap(config) }}>
            <div style={gutterStyle}>
              {i === 0 && <h3 style={labelLeftTitle(config)}>Work Experience</h3>}
              <p style={{ ...muted(config), fontSize: '9pt' }}>
                {dateRange(exp.startDate, exp.endDate, exp.current)}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableText path={`experience.${i}.title`} value={exp.title} style={heading(config)} ctx={ctx} />
              <p style={muted(config)}>{[exp.company, exp.location].filter(Boolean).join(' | ')}</p>
              {entryBody(exp, i)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Section title="Experience" ctx={ctx}>
      {data.experience.map((exp, i) => (
        <div key={i} style={entryGap(config)}>
          <EditableText path={`experience.${i}.title`} value={exp.title} style={heading(config)} ctx={ctx} />
          <p style={muted(config)}>
            {[exp.company, exp.location, dateRange(exp.startDate, exp.endDate, exp.current)]
              .filter(Boolean)
              .join(' | ')}
          </p>
          {entryBody(exp, i)}
        </div>
      ))}
    </Section>
  );
}

function EducationSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.education.length) return null;

  const degreeLine = (edu: ResumeRenderData['education'][number], i: number) => (
    <p style={heading(config)}>
      <EditableText block={false} path={`education.${i}.degree`} value={edu.degree} ctx={ctx} />
      {edu.field ? (edu.degree ? `, ${edu.field}` : edu.field) : null}
    </p>
  );

  if (ctx.labelLeft) {
    // Europass-style: dates in the gutter, label above the first entry.
    return (
      <div
        style={{
          marginBottom: `${config.spacing.sectionGapPt}pt`,
          borderTop: `1px solid ${config.colors.divider}`,
          paddingTop: '7px',
        }}
      >
        {data.education.map((edu, i) => (
          <div key={i} style={{ display: 'flex', ...entryGap(config) }}>
            <div style={gutterStyle}>
              {i === 0 && <h3 style={labelLeftTitle(config)}>Education and Training</h3>}
              {edu.date && <p style={{ ...muted(config), fontSize: '9pt' }}>{edu.date}</p>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {degreeLine(edu, i)}
              <p style={muted(config)}>
                {[edu.institution, edu.location, edu.gpa ? `GPA: ${edu.gpa}` : undefined]
                  .filter(Boolean)
                  .join(' | ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Section title="Education" ctx={ctx}>
      {data.education.map((edu, i) => (
        <div key={i} style={entryGap(config)}>
          {degreeLine(edu, i)}
          <p style={muted(config)}>
            {[edu.institution, edu.location, edu.date, edu.gpa ? `GPA: ${edu.gpa}` : undefined]
              .filter(Boolean)
              .join(' | ')}
          </p>
        </div>
      ))}
    </Section>
  );
}

function ProjectsSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.projects.length) return null;
  return (
    <Section title="Projects" ctx={ctx}>
      {data.projects.map((proj, i) => (
        <div key={i} style={entryGap(config)}>
          <EditableText path={`projects.${i}.name`} value={proj.name} style={heading(config)} ctx={ctx} />
          {proj.description && (
            <EditableText
              path={`projects.${i}.description`}
              value={proj.description}
              style={body(config)}
              ctx={ctx}
            />
          )}
          {proj.technologies && proj.technologies.length > 0 && (
            <p style={{ ...muted(config), fontSize: '9pt' }}>Tech: {proj.technologies.join(', ')}</p>
          )}
        </div>
      ))}
    </Section>
  );
}

function CertificationsSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.certifications.length) return null;
  return (
    <Section title="Certifications" ctx={ctx}>
      {data.certifications.map((cert, i) => (
        <p key={i} style={{ ...body(config), breakInside: 'avoid' }}>
          {[cert.name, cert.issuer, cert.date].filter(Boolean).join(' - ')}
        </p>
      ))}
    </Section>
  );
}

function LanguagesSection(ctx: SectionRenderContext) {
  const { data, config, columns, labelLeft } = ctx;
  if (!data.languages.length) return null;
  return (
    <Section title={labelLeft ? 'Language Skills' : 'Languages'} ctx={ctx}>
      {columns && columns > 1 ? (
        data.languages.map((l, i) => (
          <p key={i} style={{ ...body(config), breakInside: 'avoid' }}>
            {l.proficiency ? `${l.language} (${l.proficiency})` : l.language}
          </p>
        ))
      ) : (
        <p style={body(config)}>
          {data.languages
            .map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language))
            .join(', ')}
        </p>
      )}
    </Section>
  );
}

function PublicationsSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.publications.length) return null;
  return (
    <Section title="Publications" ctx={ctx}>
      {data.publications.map((pub, i) => (
        <p key={i} style={{ ...body(config), breakInside: 'avoid' }}>
          {[pub.title, pub.venue, pub.date].filter(Boolean).join(' - ')}
        </p>
      ))}
    </Section>
  );
}

function VolunteerSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.volunteer.length) return null;
  return (
    <Section title="Volunteer Experience" ctx={ctx}>
      {data.volunteer.map((vol, i) => (
        <div key={i} style={entryGap(config)}>
          <p style={heading(config)}>{vol.role || vol.organization}</p>
          {vol.role && <p style={muted(config)}>{vol.organization}</p>}
          {vol.description && <p style={body(config)}>{vol.description}</p>}
        </div>
      ))}
    </Section>
  );
}

function ReferencesSection(ctx: SectionRenderContext) {
  const { data, config } = ctx;
  if (!data.references.length) return null;
  return (
    <Section title="References" ctx={ctx}>
      {data.references.map((ref, i) => (
        <p key={i} style={{ ...body(config), breakInside: 'avoid' }}>
          {[ref.name, ref.title, ref.contact].filter(Boolean).join(' - ')}
        </p>
      ))}
    </Section>
  );
}

/* ---------------------------- custom sections ----------------------------- */

export function CustomSectionContent({
  section,
  config,
  columns,
  labelLeft,
  onFieldEdit,
}: {
  section: CustomSection;
  config: TemplateConfig;
  columns?: number;
  labelLeft?: boolean;
  onFieldEdit?: (path: string, value: string) => void;
}) {
  if (!section.items.length) return null;
  const ctx = { config, columns, labelLeft, onFieldEdit };
  const fieldPath = (i: number, j: number) =>
    `customSections.${section.id}.items.${i}.fields.${j}.value`;

  return (
    <Section title={section.title} ctx={ctx}>
      {section.type === 'paragraph'
        ? section.items.map((item, i) => (
            <p key={item.id || i} style={{ ...body(config), marginBottom: '2px' }}>
              {item.fields.map((f, j) =>
                f.value ? (
                  <span key={j}>
                    {j > 0 ? ' ' : ''}
                    <EditableText block={false} path={fieldPath(i, j)} value={f.value} ctx={ctx} />
                  </span>
                ) : null,
              )}
            </p>
          ))
        : section.type === 'keyValue'
          ? section.items.map((item, i) => (
              <div key={item.id || i} style={entryGap(config)}>
                {item.fields.map((f, j) => (
                  <p key={j} style={body(config)}>
                    {f.label ? <span style={{ fontWeight: 700 }}>{f.label}: </span> : null}
                    <EditableText block={false} path={fieldPath(i, j)} value={f.value} ctx={ctx} />
                  </p>
                ))}
              </div>
            ))
          : section.items.map((item, i) => (
              <div key={item.id || i} style={entryGap(config)}>
                {item.fields[0] && (
                  <p style={heading(config)}>
                    <EditableText block={false} path={fieldPath(i, 0)} value={item.fields[0].value} ctx={ctx} />
                  </p>
                )}
                {item.fields.slice(1).map((f, j) => (
                  <p key={j} style={f.label ? muted(config) : body(config)}>
                    {f.label ? `${f.label}: ` : null}
                    <EditableText block={false} path={fieldPath(i, j + 1)} value={f.value} ctx={ctx} />
                  </p>
                ))}
              </div>
            ))}
    </Section>
  );
}

/* ------------------------------- registry --------------------------------- */

type SectionComponent = (ctx: SectionRenderContext) => ReturnType<typeof SummarySection>;

const BUILT_IN_RENDERERS: Record<string, SectionComponent> = {
  summary: SummarySection,
  skills: SkillsSection,
  experience: ExperienceSection,
  education: EducationSection,
  projects: ProjectsSection,
  certifications: CertificationsSection,
  languages: LanguagesSection,
  publications: PublicationsSection,
  volunteer: VolunteerSection,
  references: ReferencesSection,
};

/** Render a single section (built-in or custom) by id. Returns null when empty/unknown. */
export function SectionContent({
  sectionId,
  data,
  config,
  columns,
  labelLeft,
  onFieldEdit,
}: {
  sectionId: string;
  data: ResumeRenderData;
  config: TemplateConfig;
  columns?: number;
  labelLeft?: boolean;
  onFieldEdit?: (path: string, value: string) => void;
}) {
  if (isCustomSectionId(sectionId)) {
    const uuid = customSectionUuid(sectionId);
    const section = data.customSections.find((cs) => cs.id === uuid);
    if (!section) return null;
    return (
      <CustomSectionContent
        section={section}
        config={config}
        columns={columns}
        labelLeft={labelLeft}
        onFieldEdit={onFieldEdit}
      />
    );
  }
  const Renderer = BUILT_IN_RENDERERS[sectionId];
  if (!Renderer) return null;
  return <Renderer data={data} config={config} columns={columns} labelLeft={labelLeft} onFieldEdit={onFieldEdit} />;
}

/** Human-readable label for any section id. */
export function sectionLabel(sectionId: string, data: ResumeRenderData): string {
  if (isCustomSectionId(sectionId)) {
    const uuid = customSectionUuid(sectionId);
    return data.customSections.find((cs) => cs.id === uuid)?.title ?? 'Custom section';
  }
  return SECTION_LABELS[sectionId] ?? sectionId;
}

/** Whether a section would render anything (used for empty placeholders in the builder). */
export function sectionHasContent(sectionId: string, data: ResumeRenderData): boolean {
  if (isCustomSectionId(sectionId)) {
    const uuid = customSectionUuid(sectionId);
    const cs = data.customSections.find((c) => c.id === uuid);
    return Boolean(cs && cs.items.length > 0);
  }
  switch (sectionId) {
    case 'summary':
      return Boolean(data.summary);
    case 'skills':
      return data.skills.length > 0;
    case 'experience':
      return data.experience.length > 0;
    case 'education':
      return data.education.length > 0;
    case 'projects':
      return data.projects.length > 0;
    case 'certifications':
      return data.certifications.length > 0;
    case 'languages':
      return data.languages.length > 0;
    case 'publications':
      return data.publications.length > 0;
    case 'volunteer':
      return data.volunteer.length > 0;
    case 'references':
      return data.references.length > 0;
    default:
      return false;
  }
}
