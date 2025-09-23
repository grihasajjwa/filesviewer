import { CheckCircle, Clock, AlertCircle, Folder, Globe, HardDrive } from "lucide-react";

interface StatusBadgeProps {
  type: 'uploaded' | 'drive' | 'folder' | 'internet' | 'processing' | 'error';
  text?: string;
}

export const StatusBadge = ({ type, text }: StatusBadgeProps) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'uploaded':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          defaultText: 'Uploaded'
        };
      case 'drive':
        return {
          icon: <HardDrive className="w-3 h-3" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          defaultText: 'Google Drive'
        };
      case 'folder':
        return {
          icon: <Folder className="w-3 h-3" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          defaultText: 'Drive Folder'
        };
      case 'internet':
        return {
          icon: <Globe className="w-3 h-3" />,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          defaultText: 'Internet Link'
        };
      case 'processing':
        return {
          icon: <Clock className="w-3 h-3 animate-spin" />,
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          defaultText: 'Processing'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          color: 'bg-red-100 text-red-800 border-red-200',
          defaultText: 'Error'
        };
      default:
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          defaultText: 'Unknown'
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={`inline-flex items-center space-x-1 text-xs px-2 py-1 rounded-full border ${config.color}`}>
      {config.icon}
      <span>{text || config.defaultText}</span>
    </span>
  );
};