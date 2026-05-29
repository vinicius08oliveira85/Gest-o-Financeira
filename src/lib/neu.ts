/** Classes utilitárias neumórficas (definidas em index.css). */
export const neu = {
  bg: 'neu-bg',
  surface: 'neu-surface',
  surfaceLg: 'neu-surface-lg',
  inset: 'neu-inset',
  insetSm: 'neu-inset-sm',
  input: 'neu-input',
  header: 'neu-header',
  btn: 'neu-btn',
  btnPrimary: 'neu-btn-primary',
  btnToolbar: 'neu-btn-toolbar',
  btnDanger: 'neu-btn-danger',
  btnDangerSoft: 'neu-btn-danger-soft',
  btnSuccess: 'neu-btn-success',
  btnLink: 'neu-btn-link',
  modalClose: 'neu-modal-close',
  list: 'neu-list',
  listItem: 'neu-list-item',
  listMenuItem: 'neu-list-menu-item',
  modal: 'neu-modal',
  modalHeader: 'neu-modal-header',
  modalBody: 'neu-modal-body',
  modalFooter: 'neu-modal-footer',
  pillActive: 'neu-pill-active',
  filterActive: 'neu-filter-active',
  hoverRow: 'neu-hover-row',
  dropdown: 'neu-dropdown',
  divide: 'neu-divide',
  stickyLabel: 'neu-sticky-label',
  modalBackdrop: 'neu-modal-backdrop',
  iconBadge: 'neu-icon-badge',
  iconBadgeEmerald: 'neu-icon-badge-emerald',
  tabTrack: 'neu-tab-track',
  tabActive: 'neu-tab-active',
  fab: 'neu-fab',
  toast: 'neu-toast',
  banner: 'neu-banner',
} as const;

/** Painel/card padrão do app. */
export const neuCard = `${neu.surface} rounded-2xl card-pad`;

/** Modal padrão. */
export const neuModal = `${neu.surfaceLg} rounded-3xl relative z-10 overflow-hidden`;

/** Layout responsivo (definido em index.css). */
export const layout = {
  container: 'app-container',
  pageStack: 'page-stack',
  sectionStack: 'section-stack',
  headerShell: 'header-shell',
  headerBar: 'header-bar',
  cardPad: 'card-pad',
  toolbarRow: 'toolbar-row',
  bannerRow: 'banner-row',
  emptyState: 'empty-state',
  goalsStack: 'goals-stack',
  dashboardGrid: 'dashboard-grid',
  cardsGrid: 'cards-grid',
  reportsKpiGrid: 'reports-kpi-grid',
  reportsSplitGrid: 'reports-split-grid',
  minHPanel: 'min-h-panel',
  minHPanelSm: 'min-h-panel-sm',
} as const;
