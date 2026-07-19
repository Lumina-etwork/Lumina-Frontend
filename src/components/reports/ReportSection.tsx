import React from 'react';

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  avoidBreakInside?: boolean;
  breakAfter?: boolean;
}

export function ReportSection({
  title,
  children,
  avoidBreakInside = true,
  breakAfter = true,
}: ReportSectionProps) {
  return (
    <section
      className={`report-section mb-6 p-5 bg-white border border-[#d8d0c1] rounded-lg ${
        avoidBreakInside ? 'break-inside-avoid' : ''
      } ${breakAfter ? 'break-after-page' : ''}`}
    >
      <h2 className="text-lg font-bold border-b border-[#d8d0c1] pb-2 mb-4 text-[#171512] uppercase tracking-wide">
        {title}
      </h2>
      <div className="report-section-content text-[#171512]">
        {children}
      </div>
    </section>
  );
}
