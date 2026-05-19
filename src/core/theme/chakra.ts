import type { ThemeAdapter } from "./types"

export const chakraAdapter: ThemeAdapter = {
  name: "chakra",
  config: { framework: "chakra", primary: "#7c5cff", mode: "dark" },
  classes: {
    btn: "chakra-button", btnPrimary: "css-1", btnGhost: "css-2",
    btnSm: "", btnLg: "", card: "chakra-card", cardHover: "", cardIcon: "",
    input: "chakra-input", inputError: "", label: "chakra-form-label",
    table: "chakra-table", tableHead: "", tableRow: "", tableCell: "",
    badge: "chakra-badge", badgeSuccess: "", badgeWarning: "", badgeError: "",
    modal: "chakra-modal", modalOverlay: "", modalContent: "chakra-modal__content",
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
    button: "Button", table: "Table", modal: "Modal", toast: "useToast",
    dropdown: "Menu", tooltip: "Tooltip", tabs: "Tabs", spinner: "Spinner",
    alert: "Alert", badge: "Badge", checkbox: "Checkbox", radio: "Radio",
    switch_: "Switch", progress: "Progress", pagination: "", icon: "Icon",
  },
  getDependencies() { return ["@chakra-ui/react", "@emotion/react", "@emotion/styled", "framer-motion"] },
  getImports() { return `import { Button, Table, Modal, useToast, Menu, Tooltip, Tabs, Spinner, Alert, Badge, Checkbox, Radio, Switch, Progress } from "@chakra-ui/react"` },
  getProvider() { return `import { ChakraProvider, extendTheme } from "@chakra-ui/react"\n\nconst theme = extendTheme({ config: { initialColorMode: "dark" }, colors: { brand: { 500: "#7c5cff" } } })\n\nexport function ZoruxThemeProvider({ children }: { children: React.ReactNode }) {\n  return <ChakraProvider theme={theme}>{children}</ChakraProvider>\n}` },
}
