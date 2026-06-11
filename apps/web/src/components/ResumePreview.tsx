export function ResumePreview({ content, className }: { content: Record<string, unknown> | null; className?: string }) {
  if (!content) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className || ''}`}>
        <p>No preview available</p>
      </div>
    );
  }

  const contactInfo = content.contactInfo as Record<string, string> | undefined;
  const summary = content.summary as string | undefined;
  const experience = content.experience as Array<{ title: string; company: string; bullets: string[] }> | undefined;
  const education = content.education as Array<{ degree: string; institution: string; date: string }> | undefined;
  const skills = content.skills as Array<{ name: string }> | undefined;

  return (
    <div className={`bg-white text-black p-8 max-w-[8.5in] mx-auto shadow-lg text-sm leading-relaxed ${className || ''}`}>
      {contactInfo && (
        <header className="text-center mb-4 border-b pb-3">
          <h1 className="text-xl font-bold">{contactInfo.name}</h1>
          <p className="text-gray-600 text-xs mt-1">
            {[contactInfo.email, contactInfo.phone, contactInfo.linkedin].filter(Boolean).join(' | ')}
          </p>
        </header>
      )}

      {summary && (
        <section className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-2">Summary</h2>
          <p className="text-xs">{summary}</p>
        </section>
      )}

      {experience && experience.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-2">Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <span className="font-semibold text-xs">{exp.title}</span>
                <span className="text-xs text-gray-500">{exp.company}</span>
              </div>
              <ul className="list-disc list-inside mt-1">
                {exp.bullets?.map((b, j) => <li key={j} className="text-xs text-gray-700">{b}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}

      {education && education.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-2">Education</h2>
          {education.map((edu, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="font-semibold">{edu.degree}</span>
              <span className="text-gray-500">{edu.institution} - {edu.date}</span>
            </div>
          ))}
        </section>
      )}

      {skills && skills.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 border-b border-gray-300 pb-1 mb-2">Skills</h2>
          <p className="text-xs">{skills.map(s => s.name).join(', ')}</p>
        </section>
      )}
    </div>
  );
}
