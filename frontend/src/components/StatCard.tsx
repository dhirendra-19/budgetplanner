import clsx from "clsx";

export default function StatCard({
  title,
  value,
  subtitle,
  tone = "default"
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "warn" | "alert" | "success";
}) {
  const toneClasses = {
    default: "border-slate-200",
    warn: "border-amber-200",
    alert: "border-rose-200",
    success: "border-emerald-200"
  };

  return (
    <div className={clsx("card border p-5", toneClasses[tone])}>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <p className="section-title mt-3 text-2xl text-ink">{value}</p>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

