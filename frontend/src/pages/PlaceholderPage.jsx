export function PlaceholderPage({ title, description }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-400">{description}</p>
      <div className="mt-10 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center text-slate-500">
        Sprint 1 — placeholder screen. Feature build begins in later sprints.
      </div>
    </div>
  );
}
