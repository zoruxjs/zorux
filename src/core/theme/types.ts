export type UIFramework = "tailwind" | "antd" | "mui" | "chakra" | "mantine" | "headless" | "default"

export interface ThemeConfig {
  framework: UIFramework
  primary?: string
  mode?: "light" | "dark" | "auto"
  font?: string
  radius?: string
}

export interface ClassMap {
  btn: string
  btnPrimary: string
  btnGhost: string
  btnSm: string
  btnLg: string
  card: string
  cardHover: string
  cardIcon: string
  input: string
  inputError: string
  label: string
  table: string
  tableHead: string
  tableRow: string
  tableCell: string
  badge: string
  badgeSuccess: string
  badgeWarning: string
  badgeError: string
  modal: string
  modalOverlay: string
  modalContent: string
  modalHeader: string
  modalBody: string
  modalFooter: string
  nav: string
  navLink: string
  navLinkActive: string
  sidebar: string
  sidebarLink: string
  sidebarLinkActive: string
  mainContent: string
  formGroup: string
  formError: string
  checkbox: string
  radio: string
  switch_: string
  tabs: string
  tab: string
  tabActive: string
  spinner: string
  toast: string
  toastSuccess: string
  toastError: string
  alert: string
  alertInfo: string
  alertSuccess: string
  alertWarning: string
  alertError: string
  tooltip: string
  dropdown: string
  dropdownItem: string
  divider: string
  progress: string
  empty: string
  pagination: string
  pageItem: string
  pageActive: string
}

export interface ComponentMap {
  button: string      // Component name/import path
  table: string
  modal: string
  toast: string
  dropdown: string
  tooltip: string
  tabs: string
  spinner: string
  alert: string
  badge: string
  checkbox: string
  radio: string
  switch_: string
  progress: string
  pagination: string
  icon: string
}

export interface ThemeAdapter {
  name: UIFramework
  config: ThemeConfig
  classes: ClassMap
  components: ComponentMap
  /** Returns npm packages to install for this UI framework */
  getDependencies(): string[]
  /** Returns TailwindCSS config content (if applicable) */
  getTailwindConfig?(): string
  /** Returns import statements for the UI framework */
  getImports(): string
  /** Returns provider/theme wrapper component */
  getProvider(): string
}
