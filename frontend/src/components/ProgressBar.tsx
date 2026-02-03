export default function ProgressBar({ value, tone }: { value: number; tone?: string }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const color = tone || (clamped >= 100 ? "bg-rose-500" : clamped >= 80 ? "bg-amber-400" : "bg-emerald-500");

  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

