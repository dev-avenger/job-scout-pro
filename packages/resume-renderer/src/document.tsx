import type { CSSProperties, FocusEvent } from 'react';
import type { BuilderLayoutState, LayoutRow, TemplateConfig } from '@auto-job-apply/shared-types';
import { SectionContent } from './sections.js';
import { pageSizePx, templateCssVars } from './styles.js';
import type { ResumeRenderData } from './types.js';

/* -------------------------------- header ---------------------------------- */

export function ResumeHeader({
  data,
  config,
  onFieldEdit,
}: {
  data: ResumeRenderData;
  config: TemplateConfig;
  onFieldEdit?: (path: string, value: string) => void;
}) {
  const editableName = onFieldEdit
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        onBlur: (e: FocusEvent<HTMLHeadingElement>) => onFieldEdit('name', e.currentTarget.textContent ?? ''),
      }
    : {};
  const editableNameStyle: CSSProperties = onFieldEdit ? { outline: 'none', cursor: 'text' } : {};

  // Europass-style header: "Personal information" label in the left gutter,
  // name + contact rows in the content column, photo on the far right.
  if (config.layoutVariant === 'label-left') {
    const contactLines = [
      data.contactInfo.location,
      [data.contactInfo.phone, data.contactInfo.email].filter(Boolean).join('  |  '),
      [data.contactInfo.linkedin, data.contactInfo.website, data.contactInfo.github]
        .filter(Boolean)
        .join('  |  '),
    ].filter(Boolean) as string[];

    return (
      <div style={{ padding: `0 ${config.spacing.marginPt}pt`, marginBottom: '10px' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: '26%', flexShrink: 0, paddingRight: '14px', textAlign: 'right' }}>
            <h3
              style={{
                fontFamily: config.typography.headingFont,
                fontSize: `${config.typography.sectionTitleSizePt - 1}pt`,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: config.colors.primary,
                lineHeight: 1.25,
                paddingTop: '6px',
              }}
            >
              Personal information
            </h3>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              {...editableName}
              style={{
                fontFamily: config.typography.headingFont,
                fontSize: `${config.typography.nameSizePt}pt`,
                fontWeight: 700,
                color: config.colors.primary,
                ...editableNameStyle,
              }}
            >
              {data.name}
            </h1>
            {contactLines.map((line, i) => (
              <p
                key={i}
                style={{
                  fontFamily: config.typography.bodyFont,
                  fontSize: `${config.typography.bodySizePt}pt`,
                  marginTop: i === 0 ? '4px' : '1px',
                  color: config.colors.text,
                }}
              >
                {line}
              </p>
            ))}
            {config.showPersonalDetails && data.personalDetails.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                {data.personalDetails.map((d, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: config.typography.bodyFont,
                      fontSize: `${config.typography.bodySizePt}pt`,
                      color: '#6b7280',
                    }}
                  >
                    {d.label}: {d.value}
                  </p>
                ))}
              </div>
            )}
          </div>
          {config.showPhoto && data.photoUrl && (
            <img
              src={data.photoUrl}
              alt=""
              style={{
                width: '86px',
                height: '104px',
                objectFit: 'cover',
                borderRadius: '2px',
                flexShrink: 0,
                marginLeft: '14px',
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const align = config.headerAlignment;
  const contactParts = [
    data.contactInfo.email,
    data.contactInfo.phone,
    data.contactInfo.location,
    data.contactInfo.linkedin,
    data.contactInfo.website,
    data.contactInfo.github,
  ].filter(Boolean) as string[];

  const nameStyle: CSSProperties = {
    fontFamily: config.typography.headingFont,
    fontSize: `${config.typography.nameSizePt}pt`,
    fontWeight: 700,
    ...editableNameStyle,
  };
  const contactStyle: CSSProperties = {
    fontFamily: config.typography.bodyFont,
    fontSize: `${config.typography.bodySizePt}pt`,
    marginTop: '4px',
  };

  const photo =
    config.showPhoto && data.photoUrl ? (
      <img
        src={data.photoUrl}
        alt=""
        style={{ width: '86px', height: '104px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
      />
    ) : null;

  const personalDetails =
    config.showPersonalDetails && data.personalDetails.length > 0 ? (
      <div style={{ ...contactStyle, color: '#6b7280' }}>
        {data.personalDetails.map((d, i) => (
          <span key={i}>
            {i > 0 ? ' | ' : ''}
            {d.label}: {d.value}
          </span>
        ))}
      </div>
    ) : null;

  if (config.layout === 'creative') {
    return (
      <div
        style={{
          backgroundColor: config.colors.primary,
          padding: `16px ${config.spacing.marginPt}pt`,
          textAlign: align,
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        }}
      >
        {photo}
        <div style={{ textAlign: align }}>
          <h1 {...editableName} style={{ ...nameStyle, color: '#ffffff' }}>
            {data.name}
          </h1>
          {contactParts.length > 0 && (
            <p style={{ ...contactStyle, color: '#ffffffcc' }}>{contactParts.join(' | ')}</p>
          )}
          {personalDetails}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: `0 ${config.spacing.marginPt}pt`, marginBottom: '8px' }}>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexDirection: align === 'right' ? 'row-reverse' : 'row',
          justifyContent: align === 'center' ? 'center' : 'space-between',
          textAlign: align,
        }}
      >
        <div style={{ width: photo && align === 'center' ? undefined : '100%' }}>
          <h1 {...editableName} style={{ ...nameStyle, color: config.colors.text }}>
            {data.name}
          </h1>
          {contactParts.length > 0 && (
            <p style={{ ...contactStyle, color: '#6b7280' }}>{contactParts.join(' | ')}</p>
          )}
          {personalDetails}
        </div>
        {photo}
      </div>
      <div style={{ height: '1px', marginTop: '8px', backgroundColor: config.colors.divider }} />
    </div>
  );
}

/* --------------------------------- cells ---------------------------------- */

/** Effective percentage width of a cell within its row. */
export function cellWidthPercent(row: LayoutRow, cellIndex: number): number {
  const cell = row.cells[cellIndex];
  if (!cell) return 0;
  if (cell.widthPercent !== undefined) return cell.widthPercent;
  const specified = row.cells.reduce((sum, c) => sum + (c.widthPercent ?? 0), 0);
  const unspecified = row.cells.filter((c) => c.widthPercent === undefined).length;
  return unspecified > 0 ? Math.max(0, 100 - specified) / unspecified : 0;
}

/* --------------------------------- page ----------------------------------- */

export interface ResumePageProps {
  data: ResumeRenderData;
  config: TemplateConfig;
  /** rows of this page (sections already filtered for visibility) */
  rows: LayoutRow[];
  /** render the contact header (true for first page) */
  withHeader?: boolean;
  pageIndex?: number;
  /** per-section inner column count */
  sectionColumns?: Record<string, number>;
  /** inline WYSIWYG editing callback */
  onFieldEdit?: (path: string, value: string) => void;
}

export function ResumePage({
  data,
  config,
  rows,
  withHeader = false,
  sectionColumns,
  onFieldEdit,
}: ResumePageProps) {
  const labelLeft = config.layoutVariant === 'label-left';
  const { width, height } = pageSizePx(config.pageFormat);
  const margin = `${config.spacing.marginPt}pt`;

  return (
    <div
      className="resume-page"
      style={{
        ...(templateCssVars(config) as CSSProperties),
        width,
        minHeight: height,
        backgroundColor: config.colors.background,
        color: config.colors.text,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {withHeader && (
        <div style={{ paddingTop: margin }}>
          <ResumeHeader data={data} config={config} onFieldEdit={onFieldEdit} />
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: withHeader ? '8px' : margin,
          paddingBottom: margin,
        }}
      >
        {rows.map((row, r) => {
          if (row.cells.length <= 1) {
            const cell = row.cells[0];
            return (
              <div key={r} style={{ padding: `0 ${margin}` }}>
                {cell?.sections.map((id) => (
                  <SectionContent
                    key={id}
                    sectionId={id}
                    data={data}
                    config={config}
                    columns={sectionColumns?.[id]}
                    labelLeft={labelLeft}
                    onFieldEdit={onFieldEdit}
                  />
                ))}
              </div>
            );
          }
          return (
            <div key={r} style={{ display: 'flex' }}>
              {row.cells.map((cell, c) => {
                const last = c === row.cells.length - 1;
                const padLeft = cell.tinted ? '16px' : c === 0 ? margin : '16px';
                const padRight = cell.tinted ? '16px' : last ? margin : '16px';
                return (
                  <div
                    key={c}
                    style={{
                      width: `${cellWidthPercent(row, c)}%`,
                      padding: `12px ${padRight} 12px ${padLeft}`,
                      ...(cell.tinted
                        ? { backgroundColor: `${config.colors.secondary}0D` }
                        : {}),
                    }}
                  >
                    {cell.sections.map((id) => (
                      <SectionContent
                        key={id}
                        sectionId={id}
                        data={data}
                        config={config}
                        columns={sectionColumns?.[id]}
                        onFieldEdit={onFieldEdit}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------- document ---------------------------------- */

export interface ResumeDocumentProps {
  data: ResumeRenderData;
  config: TemplateConfig;
  layoutState: BuilderLayoutState;
  /** gap between pages when rendered on screen */
  pageGapPx?: number;
  /** inline WYSIWYG editing callback */
  onFieldEdit?: (path: string, value: string) => void;
}

/** Full multi-page resume rendered from a builder layout state. */
export function ResumeDocument({
  data,
  config,
  layoutState,
  pageGapPx = 24,
  onFieldEdit,
}: ResumeDocumentProps) {
  const hidden = new Set(layoutState.hiddenSections);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: `${pageGapPx}px` }}>
      {layoutState.pages.map((page, p) => (
        <ResumePage
          key={p}
          data={data}
          config={config}
          rows={page.map((row) => ({
            cells: row.cells.map((cell) => ({
              ...cell,
              sections: cell.sections.filter((id) => !hidden.has(id)),
            })),
          }))}
          withHeader={p === 0}
          pageIndex={p}
          sectionColumns={layoutState.sectionColumns}
          onFieldEdit={onFieldEdit}
        />
      ))}
    </div>
  );
}
