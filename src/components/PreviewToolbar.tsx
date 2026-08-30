import type { ElementType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DriveActions } from "./DriveActions";
import { UserShareButton } from "./UserShareButton";
import type { FileItem } from "./FileManager";

interface PreviewToolbarProps {
  icon: ElementType;
  iconClass: string;
  title: string;
  driveFile?: FileItem | null;
  children?: ReactNode;
}

interface ActionButtonProps {
  icon: ElementType;
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "destructive";
  className?: string;
}

export const PreviewToolbar = ({
  icon: Icon,
  iconClass,
  title,
  driveFile,
  children,
}: PreviewToolbarProps) => (
  <div className="flex flex-col xs:flex-row xs:items-center justify-between p-2 sm:p-4 border-b border-border bg-muted/30 gap-2 xs:gap-0">
    <div className="flex items-center space-x-2">
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconClass}`} />
      <span className="font-medium text-xs sm:text-sm">{title}</span>
    </div>
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {children}
      {driveFile && <DriveActions key={`drive-${driveFile.id}`} file={driveFile} />}
      {driveFile && <UserShareButton key={`user-${driveFile.id}`} file={driveFile} />}
    </div>
  </div>
);


export const ActionButton = ({
  icon: Icon,
  label,
  onClick,
  variant = "secondary",
  className = "",
}: ActionButtonProps) => (
  <Button
    variant={variant}
    size="sm"
    onClick={onClick}
    className={`text-xs h-7 px-2 sm:h-8 sm:px-3 sm:text-sm ${className}`}
  >
    <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
    <span className="hidden xs:inline">{label}</span>
  </Button>
);