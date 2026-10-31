export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="max-w-2xl mx-auto px-4 py-12 text-text-primary leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-sm text-text-secondary mt-1">Last updated {updated}</p>
      {children}
    </article>
  );
}
