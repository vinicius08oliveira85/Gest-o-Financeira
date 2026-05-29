type GuidedTooltipProps = {
  text: string;
  className?: string;
};

export function GuidedTooltip({ text, className = '' }: GuidedTooltipProps) {
  return (
    <div className={`guided-tooltip ${className}`.trim()} role="status">
      <span>{text}</span>
    </div>
  );
}
