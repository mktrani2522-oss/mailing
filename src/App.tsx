import React, { useState } from 'react';
import { Header } from './components/Header';
import { VerifyTab } from './components/VerifyTab';
import { MailMergeTab } from './components/MailMergeTab';
import { AutoReplyTab } from './components/AutoReplyTab';
import { TabType, Recipient } from './types';

export default function App() {
  // Default to 'merge' tab to match reference screenshot initial state
  const [activeTab, setActiveTab] = useState<TabType>('merge');
  const [externalRecipients, setExternalRecipients] = useState<Recipient[]>([]);
  const [aiModalTrigger, setAiModalTrigger] = useState<number>(0);

  // When user transfers verified emails from VerifyTab to MailMergeTab
  const handleTransferToMerge = (recipients: Recipient[]) => {
    setExternalRecipients(recipients);
    setActiveTab('merge');
  };

  const handleClearExternal = () => {
    setExternalRecipients([]);
  };

  return (
    <div className="min-h-screen bg-gray-50/70 text-gray-900 font-sans pb-4">
      {/* Header with navigation tabs */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAiModal={() => {
          if (activeTab !== 'merge') {
            setActiveTab('merge');
          }
          setAiModalTrigger(prev => prev + 1);
        }}
      />

      {/* Main Content Area */}
      <main className="transition-all duration-300">
        {activeTab === 'verify' && (
          <VerifyTab onTransferToMerge={handleTransferToMerge} />
        )}
        {activeTab === 'merge' && (
          <MailMergeTab
            externalRecipients={externalRecipients}
            onClearExternalRecipients={handleClearExternal}
            aiModalTrigger={aiModalTrigger}
          />
        )}
        {activeTab === 'autoreply' && (
          <AutoReplyTab onSwitchToMerge={() => setActiveTab('merge')} />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-[1700px] mx-auto px-4 mt-4 pt-3 border-t border-gray-200/60 text-center text-[11px] text-gray-400">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Mail Verifier & Merge Pro -- High-Speed Sending & SPF/DKIM Reputation Shield</span>
          <div className="flex items-center space-x-3">
            <span>DNS MX Engine: Active</span>
            <span>•</span>
            <span>SMTP: Gmail, Outlook/Hotmail, Yahoo, Custom</span>
            <span>•</span>
            <span>Anti-Spam Spintax: Enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
