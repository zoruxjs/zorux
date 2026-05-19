import type { ThemeAdapter } from "./types"

export const headlessAdapter: ThemeAdapter = {
  name: "headless",
  config: { framework: "headless", primary: "#7c5cff", mode: "dark" },
  classes: {
    btn: "", btnPrimary: "", btnGhost: "", btnSm: "", btnLg: "",
    card: "", cardHover: "", cardIcon: "",
    input: "", inputError: "", label: "",
    table: "", tableHead: "", tableRow: "", tableCell: "",
    badge: "", badgeSuccess: "", badgeWarning: "", badgeError: "",
    modal: "", modalOverlay: "", modalContent: "", modalHeader: "", modalBody: "", modalFooter: "",
    nav: "", navLink: "", navLinkActive: "", sidebar: "",
    sidebarLink: "", sidebarLinkActive: "", mainContent: "",
    formGroup: "", formError: "", checkbox: "", radio: "", switch_: "",
    tabs: "", tab: "", tabActive: "", spinner: "",
    toast: "", toastSuccess: "", toastError: "",
    alert: "", alertInfo: "", alertSuccess: "", alertWarning: "", alertError: "",
    tooltip: "", dropdown: "", dropdownItem: "", divider: "",
    progress: "", empty: "", pagination: "", pageItem: "", pageActive: "",
  },
  components: {
    button: "Button", table: "Table", modal: "Dialog", toast: "",
    dropdown: "Menu", tooltip: "Popover", tabs: "Tab", spinner: "",
    alert: "", badge: "", checkbox: "Switch", radio: "RadioGroup",
    switch_: "Switch", progress: "", pagination: "", icon: "",
  },
  getDependencies() { return ["@headlessui/react", "lucide-react", "clsx"] },
  getImports() { return `import { Menu, Dialog, Tab, Switch, RadioGroup, Popover } from "@headlessui/react"\nimport * as Icons from "lucide-react"\nimport { clsx } from "clsx"` },
  getProvider() { return `export function ZoruxThemeProvider({ children }: { children: React.ReactNode }) {\n  return <>{children}</>\n}` },
}
