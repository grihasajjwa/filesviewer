import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface PreviewHeaderAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  className?: string;
  showOnMobile?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

interface PreviewHeaderProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  actions: PreviewHeaderAction[];
  children?: ReactNode;
}

export const PreviewHeader = ({
  icon: Icon,
  iconClassName = "text-primary",
  title,
  actions,
}: PreviewHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-4 border-b border-border bg-muted/30 gap-2 sm:gap-0">
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconClassName}`} />
        <span className="font-medium text-xs sm:text-sm">{title}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {actions.map((action, index) => {
          const ActionIcon = action.icon;
          return (
            <Button
              key={index}
              variant={action.variant || "secondary"}
              size="sm"
              onClick={action.onClick}
              className={`text-xs px-2 py-1 h-7 sm:h-8 sm:px-3 ${action.className || ""} ${
                action.showOnMobile === false ? "hidden sm:flex" : "flex"
              }`}
              disabled={action.disabled}
            >
              <ActionIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden xs:inline sm:inline">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
