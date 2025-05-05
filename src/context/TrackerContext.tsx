import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TrackingData, EmailData } from '../types';
import { supabase } from '../lib/supabase';

interface TrackerContextType {
  trackingData: TrackingData;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  toggleTracking: (enabled: boolean) => void;
  isTrackingEnabled: boolean;
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

export const useTracker = () => {
  const context = useContext(TrackerContext);
  if (context === undefined) {
    throw new Error('useTracker must be used within a TrackerProvider');
  }
  return context;
};

interface TrackerProviderProps {
  children: ReactNode;
}

const defaultTrackingData: TrackingData = {
  emails: [],
  totalOpens: 0,
  totalLinkClicks: 0,
  totalAttachmentDownloads: 0,
};

export const TrackerProvider = ({ children }: TrackerProviderProps) => {
  const [trackingData, setTrackingData] = useState<TrackingData>(defaultTrackingData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState<boolean>(true);

  useEffect(() => {
    const loadTrackingPreferences = async () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['trackingEnabled'], (result) => {
          setIsTrackingEnabled(result.trackingEnabled !== false);
        });
      }
    };

    loadTrackingPreferences();
    void refreshData();
  }, []);

  const refreshData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: emailsData, error: emailsError } = await supabase
        .from('emails')
        .select(`
          id,
          subject,
          recipient,
          sent_at,
          status,
          created_at,
          email_opens (
            opened_at,
            location
          ),
          link_clicks (
            clicked_at,
            original_url
          )
        `)
        .order('sent_at', { ascending: false });

      if (emailsError) throw emailsError;

      const transformedEmails = (emailsData || []).map((email: any) => ({
        id: email.id,
        subject: email.subject || 'No Subject',
        recipient: email.recipient || 'Unknown Recipient',
        sent_at: email.sent_at,
        status: email.status || 'sent',
        created_at: email.created_at,
        opens: (email.email_opens || []).map((open: any) => ({
          timestamp: open.opened_at,
          location: open.location || 'Unknown'
        })),
        linkClicks: (email.link_clicks || []).map((click: any) => ({
          timestamp: click.clicked_at,
          url: click.original_url || ''
        })),
        attachmentDownloads: []
      }));

      const totalOpens = transformedEmails.reduce((sum, email) => 
        sum + (email.opens?.length || 0), 0);
      
      const totalLinkClicks = transformedEmails.reduce((sum, email) => 
        sum + (email.linkClicks?.length || 0), 0);
      
      const totalAttachmentDownloads = transformedEmails.reduce((sum, email) => 
        sum + (email.attachmentDownloads?.length || 0), 0);

      setTrackingData({
        emails: transformedEmails,
        totalOpens,
        totalLinkClicks,
        totalAttachmentDownloads
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tracking data';
      setError(errorMessage);
      console.error('Error fetching tracking data:', error);
      setTrackingData(defaultTrackingData);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTracking = (enabled: boolean) => {
    setIsTrackingEnabled(enabled);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ trackingEnabled: enabled });
    }
  };

  return (
    <TrackerContext.Provider value={{
      trackingData,
      isLoading,
      error,
      refreshData,
      toggleTracking,
      isTrackingEnabled
    }}>
      {children}
    </TrackerContext.Provider>
  );
};