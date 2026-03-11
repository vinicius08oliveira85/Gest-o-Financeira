type GuidedTooltipProps = {
  text: string;
};

export function GuidedTooltip({ text }: GuidedTooltipProps) {
  return (
    <div className="mt-1 inline-flex max-w-xs items-start gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-[11px] shadow-lg">
      <span>{text}</span>
    </div>
  );
}

