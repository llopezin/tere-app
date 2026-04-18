import { CalendarPlus, ClipboardList } from "lucide-react";
import { cn } from "@/lib/cn";

export type DashboardTab = "book" | "appointments";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const tabs: Array<{ id: DashboardTab; label: string; shortLabel: string; icon: typeof CalendarPlus }> = [
  { id: "book", label: "Reservar Cita", shortLabel: "Reservar", icon: CalendarPlus },
  { id: "appointments", label: "Mis Citas", shortLabel: "Citas", icon: ClipboardList },
];

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <nav className="flex border-b border-border bg-surface">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-b-2 border-primary-600 bg-primary-50 text-primary-600"
                : "text-text-secondary hover:bg-neutral-100 hover:text-text",
            )}
          >
            <Icon className="size-4" />
            {/* Full label on desktop, short on mobile */}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
