const variants = {
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  danger: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
  info: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  neutral: "bg-slate-500/10 text-slate-700 ring-slate-500/20"
};

type StatusPillProps = {
  children: React.ReactNode;
  tone?: keyof typeof variants;
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${variants[tone]}`}
    >
      {children}
    </span>
  );
}
