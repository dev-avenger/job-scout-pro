const TEMPLATE_PREVIEW_COLORS: Record<string, { header: string; accent: string; bg: string }> = {
  classic: { header: '#1e3a5f', accent: '#2563eb', bg: '#f8fafc' },
  modern: { header: '#0f172a', accent: '#8b5cf6', bg: '#faf5ff' },
  minimal: { header: '#374151', accent: '#6b7280', bg: '#f9fafb' },
  creative: { header: '#be185d', accent: '#ec4899', bg: '#fdf2f8' },
  professional: { header: '#064e3b', accent: '#10b981', bg: '#ecfdf5' },
  executive: { header: '#78350f', accent: '#d97706', bg: '#fffbeb' },
  elegant: { header: '#4c1d95', accent: '#7c3aed', bg: '#f5f3ff' },
  bold: { header: '#991b1b', accent: '#ef4444', bg: '#fef2f2' },
};

export function getPreviewColors(name: string) {
  const key = name.toLowerCase();
  if (TEMPLATE_PREVIEW_COLORS[key]) return TEMPLATE_PREVIEW_COLORS[key];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return {
    header: `hsl(${h}, 50%, 25%)`,
    accent: `hsl(${h}, 60%, 50%)`,
    bg: `hsl(${h}, 40%, 97%)`,
  };
}

export function MiniResumePreview({
  colors,
}: {
  colors: { header: string; accent: string; bg: string };
}) {
  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="120" height="160" rx="3" fill={colors.bg} stroke="#e2e8f0" strokeWidth="1" />
      <rect x="0" y="0" width="120" height="32" rx="3" fill={colors.header} />
      <rect x="10" y="10" width="50" height="5" rx="1" fill="#ffffff" opacity="0.9" />
      <rect x="10" y="20" width="35" height="3" rx="1" fill="#ffffff" opacity="0.5" />
      <rect x="10" y="42" width="30" height="3" rx="1" fill={colors.accent} />
      <rect x="10" y="50" width="100" height="2" rx="1" fill="#cbd5e1" opacity="0.5" />
      <rect x="10" y="56" width="90" height="2" rx="1" fill="#cbd5e1" opacity="0.4" />
      <rect x="10" y="62" width="95" height="2" rx="1" fill="#cbd5e1" opacity="0.3" />
      <rect x="10" y="76" width="25" height="3" rx="1" fill={colors.accent} />
      <rect x="10" y="84" width="100" height="2" rx="1" fill="#cbd5e1" opacity="0.5" />
      <rect x="10" y="90" width="85" height="2" rx="1" fill="#cbd5e1" opacity="0.4" />
      <rect x="10" y="96" width="92" height="2" rx="1" fill="#cbd5e1" opacity="0.3" />
      <rect x="10" y="110" width="28" height="3" rx="1" fill={colors.accent} />
      <rect x="10" y="118" width="20" height="6" rx="3" fill={colors.accent} opacity="0.2" />
      <rect x="34" y="118" width="25" height="6" rx="3" fill={colors.accent} opacity="0.2" />
      <rect x="63" y="118" width="18" height="6" rx="3" fill={colors.accent} opacity="0.2" />
      <rect x="10" y="128" width="22" height="6" rx="3" fill={colors.accent} opacity="0.2" />
      <rect x="36" y="128" width="20" height="6" rx="3" fill={colors.accent} opacity="0.2" />
    </svg>
  );
}
