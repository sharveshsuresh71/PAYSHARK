import {
  LayoutDashboard,
  FileText,
  SlidersHorizontal,
  Bot,
  ClipboardCheck,
  Activity,
  ShieldAlert,
  FilePlus2,
  ListPlus,
  ArrowLeftRight,
  BarChart3,
  ShieldCheck,
  Code2,
  Settings,
  type LucideIcon
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Primary application navigation — every entry maps to a real route. */
export const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, description: "Operations command centre" },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, description: "Payment requests, filters and export" },
      { href: "/analytics", label: "Analytics", icon: BarChart3, description: "Volume, outcomes and risk" },
      { href: "/approvals", label: "Review Center", icon: ClipboardCheck, description: "Pending human authorizations" }
    ]
  },
  {
    label: "Governance",
    items: [
      { href: "/agreements", label: "Agreements", icon: FileText, description: "Payment agreements and analysis" },
      { href: "/policies", label: "Policies", icon: SlidersHorizontal, description: "Spending rules and limits" },
      { href: "/agents", label: "AI Agents", icon: Bot, description: "Registered autonomous agents" }
    ]
  },
  {
    label: "Security",
    items: [
      { href: "/security", label: "Security Centre", icon: ShieldCheck, description: "Sessions, credentials and integrity" },
      { href: "/audit", label: "Audit Trail", icon: Activity, description: "Hash-chained event log" },
      { href: "/demo", label: "Attack Simulator", icon: ShieldAlert, description: "Run red-team scenarios" }
    ]
  },
  {
    label: "Platform",
    items: [
      { href: "/developers", label: "Developers", icon: Code2, description: "API reference and integrations" },
      { href: "/settings", label: "Settings", icon: Settings, description: "Profile, session and preferences" }
    ]
  }
];

/** Quick actions surfaced in global search. */
export const quickActions: NavItem[] = [
  { href: "/agreements/new", label: "New agreement", icon: FilePlus2, description: "Draft and analyze an agreement" },
  { href: "/policies/new", label: "New policy", icon: ListPlus, description: "Create a spending policy" }
];

export const allNavItems: NavItem[] = navGroups.flatMap(g => g.items);

/** A nav item is active on its own route and any nested route (e.g. /agreements/123). */
export function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export function findActiveItem(pathname: string | null) {
  return allNavItems.find(item => isActivePath(pathname, item.href));
}
