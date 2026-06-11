import { useRef, useEffect, useState } from 'react';
import { ResumeDocument, normalizeResumeData, pageSizePx } from '@auto-job-apply/resume-renderer';
import { useResumeBuilderStore } from '../../stores/resume-builder-store';
import { mergeTemplateConfig } from '../../lib/template-config';

/**
 * Live preview of the resume, rendered with the shared
 * @auto-job-apply/resume-renderer package — the exact same components used
 * by the page builder canvas and the server-side PDF export.
 */
export function LiveResumePreview({
  resumeData,
  showPageBreaks = false,
}: {
  resumeData: unknown;
  showPageBreaks?: boolean;
}) {
  const { templateConfig, layoutState, customColors, customTypography, customSpacing } =
    useResumeBuilderStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const config = mergeTemplateConfig(templateConfig, customColors, customTypography, customSpacing);
  const { width, height } = pageSizePx(config.pageFormat);
  const data = normalizeResumeData(resumeData);

  // Scale content to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        setScale(Math.min(containerWidth / width, 1));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  const pageCount = layoutState.pages.length;
  const contentHeight = (height + 24) * pageCount - 24;

  return (
    <div ref={containerRef} className="w-full relative">
      {showPageBreaks && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ transformOrigin: 'top left', transform: `scale(${scale})` }}
        >
          {Array.from({ length: Math.max(pageCount - 1, 0) }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${(height + 24) * (i + 1) - 12}px` }}
            >
              <div className="flex-1 border-t-2 border-dashed border-red-400/50" />
              <span className="bg-white px-2 text-[9px] font-medium text-red-400">Page {i + 2}</span>
              <div className="flex-1 border-t-2 border-dashed border-red-400/50" />
            </div>
          ))}
        </div>
      )}
      <div
        className="origin-top-left [&_.resume-page]:border [&_.resume-page]:shadow-lg"
        style={{
          width,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginBottom: `${-(contentHeight * (1 - scale))}px`,
        }}
      >
        <ResumeDocument data={data} config={config} layoutState={layoutState} />
      </div>
    </div>
  );
}
