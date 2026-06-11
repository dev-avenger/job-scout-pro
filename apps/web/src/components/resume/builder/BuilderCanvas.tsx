import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Columns, Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { LayoutCell, LayoutRow, TemplateConfig } from '@auto-job-apply/shared-types';
import {
  ResumeHeader,
  cellWidthPercent,
  pageSizePx,
  templateCssVars,
  type ResumeRenderData,
} from '@auto-job-apply/resume-renderer';
import { makeCellId } from '../../../lib/builder-dnd';
import { useResumeBuilderStore } from '../../../stores/resume-builder-store';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { SectionBlock } from './SectionBlock';

export { makeCellId, parseCellId } from '../../../lib/builder-dnd';

/** Width presets cycled by the "Column widths" button on 2-cell rows. */
const WIDTH_PRESETS = [50, 33, 67, 25];

function CanvasCell({
  page,
  row,
  cell,
  cellDef,
  rowDef,
  data,
  config,
  hiddenSections,
  sectionColumns,
  labelLeft,
  onEditCustom,
  onFieldEdit,
}: {
  page: number;
  row: number;
  cell: number;
  cellDef: LayoutCell;
  rowDef: LayoutRow;
  data: ResumeRenderData;
  config: TemplateConfig;
  hiddenSections: string[];
  sectionColumns?: Record<string, number>;
  labelLeft?: boolean;
  onEditCustom?: (uuid: string) => void;
  onFieldEdit?: (path: string, value: string) => void;
}) {
  const droppableId = makeCellId(page, row, cell);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const margin = `${config.spacing.marginPt}pt`;
  const multi = rowDef.cells.length > 1;
  const last = cell === rowDef.cells.length - 1;
  const padLeft = !multi ? margin : cellDef.tinted ? '16px' : cell === 0 ? margin : '16px';
  const padRight = !multi ? margin : cellDef.tinted ? '16px' : last ? margin : '16px';

  const style: CSSProperties = {
    width: multi ? `${cellWidthPercent(rowDef, cell)}%` : '100%',
    padding: multi ? `12px ${padRight} 12px ${padLeft}` : `0 ${margin}`,
    ...(cellDef.tinted ? { backgroundColor: `${config.colors.secondary}0D` } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('min-h-[80px] transition-colors', isOver && 'bg-primary/5 ring-1 ring-inset ring-primary/30')}
    >
      <SortableContext items={cellDef.sections} strategy={verticalListSortingStrategy}>
        {cellDef.sections.map((id) => (
          <SectionBlock
            key={id}
            sectionId={id}
            data={data}
            config={config}
            hidden={hiddenSections.includes(id)}
            columns={sectionColumns?.[id]}
            labelLeft={labelLeft}
            onEditCustom={onEditCustom}
            onFieldEdit={onFieldEdit}
          />
        ))}
      </SortableContext>
      {cellDef.sections.length === 0 && (
        <div className="flex h-20 items-center justify-center rounded border border-dashed border-muted-foreground/30 text-xs text-muted-foreground">
          Drop sections here
        </div>
      )}
    </div>
  );
}

function CanvasRow({
  page,
  rowIndex,
  rowDef,
  data,
  config,
  hiddenSections,
  sectionColumns,
  onEditCustom,
  onFieldEdit,
}: {
  page: number;
  rowIndex: number;
  rowDef: LayoutRow;
  data: ResumeRenderData;
  config: TemplateConfig;
  hiddenSections: string[];
  sectionColumns?: Record<string, number>;
  onEditCustom?: (uuid: string) => void;
  onFieldEdit?: (path: string, value: string) => void;
}) {
  const { addRow, removeRow, setRowCellCount, setCellWidth } = useResumeBuilderStore();
  const cellCount = rowDef.cells.length;
  const labelLeft = cellCount === 1 && config.layoutVariant === 'label-left';

  const cycleWidths = () => {
    const current = rowDef.cells[0]?.widthPercent ?? 50;
    const next = WIDTH_PRESETS[(WIDTH_PRESETS.indexOf(current) + 1) % WIDTH_PRESETS.length]!;
    setCellWidth(page, rowIndex, 0, next);
  };

  return (
    <div className="group/row relative">
      {/* Row hover toolbar */}
      <div className="absolute -top-2.5 right-10 z-20 hidden items-center gap-0.5 rounded-md border bg-background px-1 py-0.5 shadow-sm group-hover/row:flex">
        <button
          type="button"
          className="p-0.5 text-muted-foreground hover:text-foreground"
          title="Add row below"
          onClick={() => addRow(page, rowIndex + 1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            className={cn(
              'px-1 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground',
              cellCount === n && 'rounded bg-primary/10 text-primary',
            )}
            title={`Split row into ${n} column${n > 1 ? 's' : ''}`}
            onClick={() => setRowCellCount(page, rowIndex, n)}
          >
            {n}
          </button>
        ))}
        {cellCount === 2 && (
          <button
            type="button"
            className="flex items-center gap-0.5 p-0.5 text-muted-foreground hover:text-foreground"
            title="Column widths"
            onClick={cycleWidths}
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="text-[9px] font-semibold">{Math.round(rowDef.cells[0]?.widthPercent ?? 50)}%</span>
          </button>
        )}
        <button
          type="button"
          className="p-0.5 text-muted-foreground hover:text-destructive"
          title="Delete row"
          onClick={() => removeRow(page, rowIndex)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div style={{ display: 'flex' }}>
        {rowDef.cells.map((cellDef, c) => (
          <CanvasCell
            key={c}
            page={page}
            row={rowIndex}
            cell={c}
            cellDef={cellDef}
            rowDef={rowDef}
            data={data}
            config={config}
            hiddenSections={hiddenSections}
            sectionColumns={sectionColumns}
            labelLeft={labelLeft}
            onEditCustom={onEditCustom}
            onFieldEdit={onFieldEdit}
          />
        ))}
      </div>
    </div>
  );
}

export function BuilderCanvas({
  data,
  config,
  onEditCustom,
  onFieldEdit,
}: {
  data: ResumeRenderData;
  config: TemplateConfig;
  onEditCustom?: (uuid: string) => void;
  onFieldEdit?: (path: string, value: string) => void;
}) {
  const { layoutState, addPage, removePage, addRow } = useResumeBuilderStore();
  const { width, height } = pageSizePx(config.pageFormat);
  const cssVars = templateCssVars(config) as CSSProperties;
  const margin = `${config.spacing.marginPt}pt`;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {layoutState.pages.map((page, p) => {
        const withHeader = p === 0;
        return (
          <div key={p} className="relative">
            <div className="absolute -top-5 left-0 flex w-full items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Page {p + 1} of {layoutState.pages.length}
              </span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => addRow(p)}
                  title="Add row at the end of this page"
                >
                  <Plus className="h-3 w-3" /> Add row
                </button>
                {layoutState.pages.length > 1 && (
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-destructive"
                    onClick={() => removePage(p)}
                    title="Remove page (sections move to previous page)"
                  >
                    <Trash2 className="h-3 w-3" /> Remove page
                  </button>
                )}
              </span>
            </div>
            <div
              className="resume-page border bg-white shadow-lg"
              style={{
                ...cssVars,
                width,
                minHeight: height,
                color: config.colors.text,
                backgroundColor: config.colors.background,
                display: 'flex',
                flexDirection: 'column',
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
                {page.map((rowDef, r) => (
                  <CanvasRow
                    key={r}
                    page={p}
                    rowIndex={r}
                    rowDef={rowDef}
                    data={data}
                    config={config}
                    hiddenSections={layoutState.hiddenSections}
                    sectionColumns={layoutState.sectionColumns}
                    onEditCustom={onEditCustom}
                    onFieldEdit={onFieldEdit}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addPage}>
        <Plus className="mr-1 h-4 w-4" /> Add page
      </Button>
    </div>
  );
}
