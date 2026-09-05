import { CheckCircle, Clock, AlertCircle, Folder, Globe, HardDrive, Facebook, Cloud } from "lucide-react";

interface StatusBadgeProps {
  type: 'uploaded' | 'onedrive' | 'drive' | 'folder' | 'internet' | 'processing' | 'error' | 'facebook';
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
      case 'onedrive':
        return {
          icon: <Cloud className="w-3 h-3" />,
          color: 'bg-sky-100 text-sky-800 border-sky-200',
          defaultText: 'OneDrive'
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
      case 'facebook':
        return {
          icon: <Facebook className="w-3 h-3" />,
          color: 'bg-blue-100 text-blue-600 border-blue-200',
          defaultText: 'Facebook'
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
    <span className={`inline-flex items-center justify-center p-1 rounded-full border ${config.color}`} title={text || config.defaultText}>
      {config.icon}
    </span>
  );
};