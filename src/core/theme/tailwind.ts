import type { ThemeAdapter, ClassMap, ComponentMap } from "./types"

const classes: ClassMap = {
  btn: "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 px-4 py-2",
  btnPrimary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  btnGhost: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  btnSm: "h-8 px-3 text-xs",
  btnLg: "h-12 px-8 text-base rounded-xl",
  card: "rounded-xl border bg-card text-card-foreground shadow-sm",
  cardHover: "transition-all hover:shadow-md hover:-translate-y-0.5",
  cardIcon: "w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-primary/10 border border-primary/20",
  input: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  inputError: "border-destructive focus-visible:ring-destructive",
  label: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  table: "w-full caption-bottom text-sm",
  tableHead: "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
  tableRow: "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
  tableCell: "p-4 align-middle [&:has([role=checkbox])]:pr-0",
  badge: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  badgeSuccess: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  badgeWarning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  badgeError: "border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  modal: "fixed inset-0 z-50 flex items-center justify-center",
  modalOverlay: "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
  modalContent: "relative z-50 w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg",
  modalHeader: "flex flex-col space-y-1.5 text-center sm:text-left",
  modalBody: "p-6 pt-0",
  modalFooter: "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
  nav: "flex items-center gap-6",
  navLink: "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
  navLinkActive: "text-foreground",
  sidebar: "w-60 flex-shrink-0 border-r bg-card p-4",
  sidebarLink: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-foreground",
  sidebarLinkActive: "bg-primary/10 text-primary font-medium",
  mainContent: "flex-1 p-6",
  formGroup: "space-y-2",
  formError: "text-sm text-destructive",
  checkbox: "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary",
  radio: "h-4 w-4 border-gray-300 text-primary focus:ring-primary",
  switch_: "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
  tabs: "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
  tab: "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  tabActive: "bg-background text-foreground shadow-sm",
  spinner: "h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent",
  toast: "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg",
  toastSuccess: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
  toastError: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  alert: "relative w-full rounded-lg border p-4 text-sm",
  alertInfo: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  alertSuccess: "border-green-200 bg-green-50 text-green-900",
  alertWarning: "border-yellow-200 bg-yellow-50 text-yellow-900",
  alertError: "border-red-200 bg-red-50 text-red-900",
  tooltip: "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
  dropdown: "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
  dropdownItem: "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  divider: "h-px bg-border",
  progress: "h-2 w-full overflow-hidden rounded-full bg-secondary",
  empty: "flex flex-col items-center justify-center py-12 text-center",
  pagination: "flex items-center gap-1",
  pageItem: "inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 transition-colors hover:bg-accent hover:text-accent-foreground",
  pageActive: "bg-primary text-primary-foreground hover:bg-primary",
}

const components: ComponentMap = {
  button: "Button",
  table: "Table",
  modal: "Dialog",
  toast: "Toast",
  dropdown: "DropdownMenu",
  tooltip: "Tooltip",
  tabs: "Tabs",
  spinner: "Spinner",
  alert: "Alert",
  badge: "Badge",
  checkbox: "Checkbox",
  radio: "RadioGroup",
  switch_: "Switch",
  progress: "Progress",
  pagination: "Pagination",
  icon: "LucideIcon",
}

export const tailwindAdapter: ThemeAdapter = {
  name: "tailwind",
  config: { framework: "tailwind", primary: "#7c5cff", mode: "dark" },
  classes,
  components,

  getDependencies() {
    return [
      "tailwindcss", "postcss", "autoprefixer",
      "lucide-react",
      "class-variance-authority", "clsx", "tailwind-merge",
      "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs", "@radix-ui/react-tooltip",
      "@radix-ui/react-switch", "@radix-ui/react-checkbox",
      "@radix-ui/react-radio-group", "@radix-ui/react-progress",
      "@radix-ui/react-toast",
    ]
  },

  getTailwindConfig() {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./views/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
    },
  },
  plugins: [require("tailwindcss-animate")],
}`
  },

  getImports() {
    return `import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Toaster, toast } from "@/components/ui/sonner"
import * as Lucide from "lucide-react"`
  },

  getProvider() {
    return `// Zorux Theme Provider — wraps app with shadcn/ui + Tailwind
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"

export function ZoruxThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
      <Toaster />
    </ThemeProvider>
  )
}`
  },
}
