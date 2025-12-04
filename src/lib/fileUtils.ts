export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${size} ${sizes[i]}`;
};

export const getFileExtension = (filename: string): string => {
  return filename.split(".").pop()?.toLowerCase() || "";
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  return imageExtensions.includes(getFileExtension(filename));
};

export const isPdfFile = (filename: string): boolean => {
  return getFileExtension(filename) === "pdf";
};

export const isOfficeFile = (filename: string): boolean => {
  const officeExtensions = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];
  return officeExtensions.includes(getFileExtension(filename));
};

export const isPowerPointFile = (filename: string): boolean => {
  const powerPointExtensions = ["ppt", "pptx"];
  return powerPointExtensions.includes(getFileExtension(filename));
};

export const isWordFile = (filename: string): boolean => {
  const wordExtensions = ["doc", "docx"];
  return wordExtensions.includes(getFileExtension(filename));
};

export const isExcelFile = (filename: string): boolean => {
  const excelExtensions = ["xls", "xlsx", "xlsm", "csv"];
  return excelExtensions.includes(getFileExtension(filename));
};

export const isAudioFile = (filename: string): boolean => {
  const audioExtensions = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "wma"];
  return audioExtensions.includes(getFileExtension(filename));
};

export const isYouTubeUrl = (url: string): boolean => {
  const youtubePatterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]+/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/[\w-]+/,
  ];
  return youtubePatterns.some(pattern => pattern.test(url));
};

export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};