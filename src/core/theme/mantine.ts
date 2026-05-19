import type { ThemeAdapter } from "./types"

export const mantineAdapter: ThemeAdapter = {
  name: "mantine",
  config: { framework: "mantine", primary: "#7c5cff", mode: "dark" },
  classes: {
    btn: "mantine-Button-root", btnPrimary: "", btnGhost: "",
    btnSm: "", btnLg: "", card: "mantine-Card-root", cardHover: "", cardIcon: "",
    input: "mantine-Input-input", inputError: "", label: "mantine-Input-label",
    table: "mantine-Table-root", tableHead: "", tableRow: "", tableCell: "",
    badge: "mantine-Badge-root", badgeSuccess: "", badgeWarning: "", badgeError: "",
    modal: "mantine-Modal-root", modalOverlay: "", modalContent: "",
    modalHeader: "", modalBody: "", modalFooter: "",
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
    button: "Button", table: "Table", modal: "Modal", toast: "Notifications",
    dropdown: "Menu", tooltip: "Tooltip", tabs: "Tabs", spinner: "Loader",
    alert: "Alert", badge: "Badge", checkbox: "Checkbox", radio: "Radio",
    switch_: "Switch", progress: "Progress", pagination: "Pagination", icon: "Icon",
  },
  getDependencies() { return ["@mantine/core", "@mantine/hooks", "@mantine/notifications", "@tabler/icons-react"] },
  getImports() { return `import { Button, Table, Modal, Menu, Tooltip, Tabs, Loader, Alert, Badge, Checkbox, Radio, Switch, Progress, Pagination } from "@mantine/core"\nimport { Notifications } from "@mantine/notifications"` },
  getProvider() { return `import { MantineProvider } from "@mantine/core"\nimport { Notifications } from "@mantine/notifications"\n\nexport function ZoruxThemeProvider({ children }: { children: React.ReactNode }) {\n  return (\n    <MantineProvider defaultColorScheme="dark" theme={{ primaryColor: "violet" }}>\n      <Notifications />\n      {children}\n    </MantineProvider>\n  )\n}` },
}
