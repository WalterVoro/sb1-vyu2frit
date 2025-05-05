export interface OpenEvent {
  timestamp: string;
  location?: string;
}

export interface LinkClickEvent {
  url: string;
  timestamp: string;
}

export interface AttachmentDownloadEvent {
  filename: string;
  timestamp: string;
}

export interface EmailData {
  id: string;
  subject: string;
  recipient: string;
  sent_at: string; // Changed from sentAt to sent_at to match DB schema
  status: 'sent' | 'opened' | 'clicked';
  created_at?: string; // Added to match DB schema
  opens: OpenEvent[];
  linkClicks: LinkClickEvent[];
  attachmentDownloads: AttachmentDownloadEvent[];
}

export interface TrackingData {
  emails: EmailData[];
  totalOpens: number;
  totalLinkClicks: number;
  totalAttachmentDownloads: number;
}

export interface TrackingOptions {
  trackOpens: boolean;
  trackLinks: boolean;
  trackAttachments: boolean;
  showNotifications: boolean;
}