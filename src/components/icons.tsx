import type { ComponentType } from 'react';
import {
  AddRegular,
  AlertRegular,
  BoardFilled,
  BoardRegular,
  BuildingBankFilled,
  BuildingBankRegular,
  ArrowCounterclockwiseRegular,
  ArrowDownloadRegular,
  ArrowTrendingDownRegular,
  ArrowTrendingRegular,
  ArrowUndoRegular,
  ArrowUpRightRegular,
  CalendarLtrFilled,
  CalendarLtrRegular,
  CheckmarkCircleRegular,
  CheckmarkFilled,
  ClipboardTaskListLtrFilled,
  ClipboardTaskListLtrRegular,
  CloudArrowDownRegular,
  CloudOffRegular,
  CloudRegular,
  DataBarVerticalFilled,
  DataBarVerticalRegular,
  DocumentArrowDownRegular,
  CheckmarkRegular,
  ChevronDownRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  CircleRegular,
  DeleteRegular,
  DismissRegular,
  DocumentRegular,
  EditRegular,
  FilterRegular,
  FolderFilled,
  FolderRegular,
  GaugeRegular,
  GiftFilled,
  GiftRegular,
  InfoRegular,
  MoneyHandRegular,
  MoneyRegular,
  MoreVerticalRegular,
  OpenRegular,
  OptionsFilled,
  OptionsRegular,
  PaymentFilled,
  PaymentRegular,
  ProhibitedRegular,
  SaveRegular,
  SearchRegular,
  SendRegular,
  SpinnerIosRegular,
  TagRegular,
  TargetFilled,
  TargetRegular,
  TaskListLtrRegular,
  TextNumberListLtrFilled,
  TextNumberListLtrRegular,
  WarningRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from '@fluentui/react-icons';

/**
 * Ícones do app na variante Regular do Fluent System Icons (Windows 12) — traço
 * arredondado e fino, nunca preenchido. Os nomes exportados são os mesmos que as
 * telas já usavam (eram do lucide-react), então a troca de biblioteca não mexeu
 * na marcação: `size` vira `fontSize` e a cor vem de `currentColor` pelo
 * `className` de texto.
 */
export type IconProps = {
  /** Tamanho em px (padrão 20, como os ícones base do Fluent). */
  size?: number | string;
  /**
   * Variante Filled: só para itens ativos (aba atual, filtro selecionado).
   * Ícones sem par Filled no Fluent caem na variante Regular.
   */
  filled?: boolean;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  title?: string;
} & Record<string, unknown>;

type FluentGlyph = ComponentType<{
  fontSize?: number | string;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

function createIcon(glyph: unknown, displayName: string, filledGlyph?: unknown) {
  const Regular = glyph as FluentGlyph;
  const Filled = (filledGlyph ?? glyph) as FluentGlyph;

  function Icon({ size = 20, className, filled = false, ...rest }: IconProps) {
    const Glyph = filled ? Filled : Regular;
    // Decorativo por padrão: o nome acessível vem do botão/aria-label em volta.
    return (
      <Glyph
        fontSize={size}
        className={className}
        aria-hidden
        {...(rest as Record<string, unknown>)}
      />
    );
  }

  Icon.displayName = displayName;
  return Icon;
}

export const Plus = createIcon(AddRegular, 'Plus');
export const BellRing = createIcon(AlertRegular, 'BellRing');
export const RotateCcw = createIcon(ArrowCounterclockwiseRegular, 'RotateCcw');
export const Download = createIcon(ArrowDownloadRegular, 'Download');
export const TrendingDown = createIcon(ArrowTrendingDownRegular, 'TrendingDown');
export const TrendingUp = createIcon(ArrowTrendingRegular, 'TrendingUp');
export const Undo2 = createIcon(ArrowUndoRegular, 'Undo2');
export const ArrowUpRight = createIcon(ArrowUpRightRegular, 'ArrowUpRight');
export const Calendar = createIcon(CalendarLtrRegular, 'Calendar', CalendarLtrFilled);
export const CheckCircle2 = createIcon(CheckmarkCircleRegular, 'CheckCircle2');
export const Check = createIcon(CheckmarkRegular, 'Check', CheckmarkFilled);
export const ChevronDown = createIcon(ChevronDownRegular, 'ChevronDown');
export const ChevronLeft = createIcon(ChevronLeftRegular, 'ChevronLeft');
export const ChevronRight = createIcon(ChevronRightRegular, 'ChevronRight');
export const Circle = createIcon(CircleRegular, 'Circle');
export const Trash2 = createIcon(DeleteRegular, 'Trash2');
export const X = createIcon(DismissRegular, 'X');
export const FileText = createIcon(DocumentRegular, 'FileText');
export const Pencil = createIcon(EditRegular, 'Pencil');
export const Filter = createIcon(FilterRegular, 'Filter');
export const Gift = createIcon(GiftRegular, 'Gift', GiftFilled);
export const HandCoins = createIcon(MoneyHandRegular, 'HandCoins');
export const DollarSign = createIcon(MoneyRegular, 'DollarSign');
export const ExternalLink = createIcon(OpenRegular, 'ExternalLink');
export const SlidersHorizontal = createIcon(OptionsRegular, 'SlidersHorizontal', OptionsFilled);
export const CreditCard = createIcon(PaymentRegular, 'CreditCard', PaymentFilled);
export const Ban = createIcon(ProhibitedRegular, 'Ban');
export const Search = createIcon(SearchRegular, 'Search');
export const Loader2 = createIcon(SpinnerIosRegular, 'Loader2');
export const Tag = createIcon(TagRegular, 'Tag');
export const Target = createIcon(TargetRegular, 'Target', TargetFilled);
export const ListOrdered = createIcon(
  TextNumberListLtrRegular,
  'ListOrdered',
  TextNumberListLtrFilled
);
export const Folder = createIcon(FolderRegular, 'Folder', FolderFilled);
export const AlertTriangle = createIcon(WarningRegular, 'AlertTriangle');
export const BarChart3 = createIcon(DataBarVerticalRegular, 'BarChart3', DataBarVerticalFilled);
export const Cloud = createIcon(CloudRegular, 'Cloud');
export const CloudDownload = createIcon(CloudArrowDownRegular, 'CloudDownload');
export const CloudOff = createIcon(CloudOffRegular, 'CloudOff');
export const FileDown = createIcon(DocumentArrowDownRegular, 'FileDown');
export const Gauge = createIcon(GaugeRegular, 'Gauge');
export const Info = createIcon(InfoRegular, 'Info');
export const Landmark = createIcon(BuildingBankRegular, 'Landmark', BuildingBankFilled);
export const LayoutDashboard = createIcon(BoardRegular, 'LayoutDashboard', BoardFilled);
export const ListChecks = createIcon(TaskListLtrRegular, 'ListChecks');
export const ListTodo = createIcon(
  ClipboardTaskListLtrRegular,
  'ListTodo',
  ClipboardTaskListLtrFilled
);
export const Moon = createIcon(WeatherMoonRegular, 'Moon');
export const MoreVertical = createIcon(MoreVerticalRegular, 'MoreVertical');
export const Save = createIcon(SaveRegular, 'Save');
export const Send = createIcon(SendRegular, 'Send');
export const Sun = createIcon(WeatherSunnyRegular, 'Sun');
