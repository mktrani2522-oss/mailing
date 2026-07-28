import React, { useState, useRef } from 'react';
import { Key, Users, Mail, Send, AlertTriangle, Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock, Eye, Sparkles, RefreshCw, Trash2, ShieldCheck, Activity, Terminal, BarChart3, BookOpen, HelpCircle } from 'lucide-react';
import Papa from 'papaparse';
import { SendingAccount, Recipient, SendLog, EmailMode, ProviderType, OpenEvent } from '../types';
import { AiModal } from './AiModal';
import { extractNameFromEmail, parseEmailAndName } from '../lib/nameExtractor';
import { applyAiAntiSpamWord, getAiWordForRecipient } from '../lib/aiAntiSpam';

interface MailMergeTabProps {
  onOpenAiModal?: () => void;
  externalRecipients?: Recipient[];
  onClearExternalRecipients?: () => void;
  aiModalTrigger?: number;
}

export const MailMergeTab: React.FC<MailMergeTabProps> = ({
  onOpenAiModal,
  externalRecipients,
  onClearExternalRecipients,
  aiModalTrigger,
}) => {
  // Account State
  const [provider, setProvider] = useState<ProviderType>(() => (localStorage.getItem('mm_provider') as ProviderType) || 'gmail');
  const [email, setEmail] = useState(() => localStorage.getItem('mm_email') || 'mackmc222@gmail.com');
  const [password, setPassword] = useState(() => localStorage.getItem('mm_password') || 'app-password-demo');
  const [customHost, setCustomHost] = useState(() => localStorage.getItem('mm_customHost') || 'smtp.example.com');
  const [customPort, setCustomPort] = useState(() => Number(localStorage.getItem('mm_customPort')) || 587);

  // Mode & Speed State
  const [emailMode, setEmailMode] = useState<EmailMode>(() => (localStorage.getItem('mm_emailMode') as EmailMode) || 'normal');
  const [parallelSpeed, setParallelSpeed] = useState<number>(5);
  const [delayMs, setDelayMs] = useState<number>(5);

  // Recipients State
  const [rawEmails, setRawEmails] = useState<string>(() => {
    return localStorage.getItem('mm_rawEmails') || `dorothy@dorothychengjewelry.com\nlavenderbeefarm@yahoo.com\ncustomerservice@yixhifoods.com\nservicetreecare@yahoo.com\nrboyette@aapcogroup.com`;
  });
  const [parsedRecipients, setParsedRecipients] = useState<Recipient[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compose State
  const [senderName, setSenderName] = useState(() => localStorage.getItem('mm_senderName') || 'Michael Scott');
  const [replyTo, setReplyTo] = useState(() => localStorage.getItem('mm_replyTo') || '');
  const [subject, setSubject] = useState(() => localStorage.getItem('mm_subject') || 'note');
  const [body, setBody] = useState(() => localStorage.getItem('mm_body') || `Hello,\nI noticed a ranking error on your site that may deserve attention.\nCan I share a screenshot?\nThanks & regards`);

  // Sending & Log State
  const [isSending, setIsSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<SendLog[]>([]);
  const [statusLogFeed, setStatusLogFeed] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<SendLog | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Open Tracking Stats & Spam Shield State
  const [openStats, setOpenStats] = useState<OpenEvent[]>([]);
  const [totalOpens, setTotalOpens] = useState<number>(0);
  const [spamScore, setSpamScore] = useState<{ score: number; status: string; foundTriggers: string[]; suggestions: string[] } | null>(null);
  const [checkingSpam, setCheckingSpam] = useState(false);
  const [simulatingRead, setSimulatingRead] = useState(false);
  const [showSpamGuideModal, setShowSpamGuideModal] = useState(false);
  const [showAiWordPreview, setShowAiWordPreview] = useState(false);

  // Poll Open / Read Analytics
  const fetchOpenStats = async () => {
    try {
      const res = await fetch('/api/track-stats');
      if (res.ok) {
        const data = await res.json();
        setOpenStats(data.opens || []);
        setTotalOpens(data.totalOpens || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchOpenStats();
    const timer = setInterval(fetchOpenStats, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckSpam = async () => {
    setCheckingSpam(true);
    try {
      const res = await fetch('/api/check-spam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      if (res.ok) {
        const data = await res.json();
        setSpamScore(data);
      }
    } catch (e) {
      alert('Failed to check spam score');
    } finally {
      setCheckingSpam(false);
    }
  };

  const handleSimulateRead = async () => {
    if (sendLogs.length === 0 && openStats.length === 0) {
      alert('⚠️ No emails sent yet! Send a test email or campaign first to simulate someone opening it.');
      return;
    }
    setSimulatingRead(true);
    try {
      const targetEmail = sendLogs[0]?.email || 'client.lead@company.com';
      const targetId = sendLogs[0]?.id || `sim-test-${Date.now()}`;
      await fetch('/api/simulate-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, email: targetEmail }),
      });
      await fetchOpenStats();
      alert(`⚡ Simulated live email open by ${targetEmail}!\nCheck the Open & Read Analytics dashboard below.`);
    } catch (e) {
      alert('Failed to simulate read event');
    } finally {
      setSimulatingRead(false);
    }
  };

  const handleClearReadStats = async () => {
    try {
      await fetch('/api/track-stats', { method: 'DELETE' });
      setOpenStats([]);
      setTotalOpens(0);
    } catch (e) {
      // ignore
    }
  };

  // Open modal if trigger changes from parent header
  React.useEffect(() => {
    if (aiModalTrigger && aiModalTrigger > 0) {
      setIsAiModalOpen(true);
    }
  }, [aiModalTrigger]);

  // Handle external recipients from Verify tab if transferred
  React.useEffect(() => {
    if (externalRecipients && externalRecipients.length > 0) {
      setParsedRecipients(externalRecipients);
      const emailText = externalRecipients.map(r => r.email).join('\n');
      setRawEmails(emailText);
    }
  }, [externalRecipients]);

  // Persist campaign setup so template subject and body never disappear after sending
  React.useEffect(() => {
    localStorage.setItem('mm_provider', provider);
    localStorage.setItem('mm_email', email);
    localStorage.setItem('mm_password', password);
    localStorage.setItem('mm_customHost', customHost);
    localStorage.setItem('mm_customPort', String(customPort));
    localStorage.setItem('mm_emailMode', emailMode);
    localStorage.setItem('mm_rawEmails', rawEmails);
    localStorage.setItem('mm_senderName', senderName);
    localStorage.setItem('mm_replyTo', replyTo);
    localStorage.setItem('mm_subject', subject);
    localStorage.setItem('mm_body', body);
  }, [provider, email, password, customHost, customPort, emailMode, rawEmails, senderName, replyTo, subject, body]);

  // Compute active recipient list with Smart Auto-Name Extraction
  const activeRecipients: Recipient[] = React.useMemo(() => {
    if (parsedRecipients.length > 0) {
      return parsedRecipients.map(r => {
        const parsed = parseEmailAndName(r.email);
        const existingName = r.fields?.name || r.fields?.Name || r.fields?.first_name || '';
        const name = existingName.trim() || parsed.name;
        return {
          ...r,
          email: parsed.email || r.email,
          fields: { ...r.fields, name }
        };
      });
    }
    const lines = rawEmails.split(/\r?\n|,|;/).map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const parsed = parseEmailAndName(line);
      return { email: parsed.email || line, fields: { name: parsed.name } };
    });
  }, [rawEmails, parsedRecipients]);

  // Display columns including auto-detected variables
  const displayColumns = React.useMemo(() => {
    const cols = new Set(availableColumns);
    cols.add('name');
    cols.add('email');
    return Array.from(cols);
  }, [availableColumns]);

  // CSV Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.meta.fields || [];
          setAvailableColumns(headers);

          // Find email column
          const emailCol = headers.find(h => /^email|mail|e-mail$/i.test(h.trim())) || headers[0];
          
          const recips: Recipient[] = [];
          for (const row of results.data as Record<string, string>[]) {
            const emailVal = row[emailCol]?.trim();
            if (emailVal && emailVal.includes('@')) {
              recips.push({
                email: emailVal,
                fields: row,
              });
            }
          }
          setParsedRecipients(recips);
          setRawEmails(recips.map(r => r.email).join('\n'));
        }
      },
      error: (err) => {
        alert(`Error parsing file: ${err.message}`);
      }
    });
  };

  // Insert variable tag into body
  const insertVariable = (col: string) => {
    setBody(prev => `${prev} {{${col}}}`);
  };

  // Execute Campaign with Real-Time Bulk Send Monitoring & Batching
  const handleSendCampaign = async () => {
    if (activeRecipients.length === 0) {
      alert('Please provide at least one recipient email address.');
      return;
    }

    if (provider !== 'simulator' && (!email || !password)) {
      if (!confirm('You have not entered real SMTP credentials. Would you like to switch to Simulator Mode to test sending without real passwords?')) {
        return;
      }
      setProvider('simulator');
    }

    setIsSending(true);
    setErrorMessage('');
    setSendLogs([]);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setStatusLogFeed([
      `[${timeStr}] 🚀 Initializing Bulk Send Engine (${provider.toUpperCase()} provider)...`,
      `[${timeStr}] 📋 Target list locked: ${activeRecipients.length} recipients. Mode: ${emailMode.toUpperCase()}.`
    ]);

    const account: SendingAccount = {
      provider,
      email,
      password,
      host: customHost,
      port: customPort,
    };

    // Determine batch size for instant real-time feedback (larger chunks for high speed pooled sending)
    const chunkSize = emailMode === 'bcc' ? 100 : Math.max(10, Math.min(50, parallelSpeed));
    const totalChunks = Math.ceil(activeRecipients.length / chunkSize);

    let accumulatedSent = 0;
    let accumulatedFailed = 0;

    try {
      for (let idx = 0; idx < totalChunks; idx++) {
        const startIdx = idx * chunkSize;
        const chunk = activeRecipients.slice(startIdx, startIdx + chunkSize);

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setStatusLogFeed(prev => [
          `[${nowStr}] ⚡ Dispatching Batch ${idx + 1} of ${totalChunks} (${chunk.length} recipients: ${chunk[0].email}${chunk.length > 1 ? '...' : ''})...`,
          ...prev
        ]);

        const response = await fetch('/api/send-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account,
            mode: emailMode,
            speed: { parallel: parallelSpeed, delayMs },
            compose: { senderName, replyTo, subject, body, isHtml: emailMode === 'html' },
            recipients: chunk,
            trackingUrlOrigin: window.location.origin,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Batch ${idx + 1} failed to execute`);
        }

        if (data.results && Array.isArray(data.results)) {
          const batchSent = data.results.filter((r: any) => r.status === 'sent').length;
          const batchFailed = data.results.filter((r: any) => r.status === 'failed').length;
          accumulatedSent += batchSent;
          accumulatedFailed += batchFailed;

          setSendLogs(prev => [...prev, ...data.results]);

          const resStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setStatusLogFeed(prev => [
            `[${resStr}] ✔️ Batch ${idx + 1} completed: +${batchSent} sent, +${batchFailed} failed. (Progress: ${accumulatedSent + accumulatedFailed} / ${activeRecipients.length})`,
            ...prev
          ]);
        }

        // Apply anti-spam inter-batch delay if more chunks remain
        if (idx < totalChunks - 1) {
          const actualDelay = Math.max(delayMs, 350);
          const delayStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setStatusLogFeed(prev => [
            `[${delayStr}] ⏳ Anti-Spam Shield: applying inter-batch delay (${actualDelay}ms)...`,
            ...prev
          ]);
          await new Promise((resolve) => setTimeout(resolve, actualDelay));
        }
      }

      const endStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setStatusLogFeed(prev => [
        `[${endStr}] ✨ 🎉 Campaign Fully Dispatched! Final Status: ${accumulatedSent} Delivered, ${accumulatedFailed} Bounced/Failed.`,
        ...prev
      ]);
    } catch (err: any) {
      const errStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setErrorMessage(err.message || 'An error occurred during campaign delivery.');
      setStatusLogFeed(prev => [
        `[${errStr}] ❌ Fatal Error during delivery: ${err.message || 'Unknown error'}`,
        ...prev
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const sentCount = sendLogs.filter(r => r.status === 'sent').length;
  const failedCount = sendLogs.filter(r => r.status === 'failed').length;

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-3 space-y-3 animate-fade-in">
      {/* Sleek Horizontal Header Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-md flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">Mail Merge Studio</h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                ✨ Hotmail • Outlook • Gmail • Yahoo Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Real SMTP & BCC Batch blast engine • Auto-name formatting • 100% Inbox Placement
            </p>
          </div>
        </div>

        {/* Speed Presets Pills */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEmailMode('normal');
              setParallelSpeed(30);
              setDelayMs(33);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              emailMode !== 'bcc' && parallelSpeed >= 25
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ⚡ 30/s Normal
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailMode('bcc');
              setParallelSpeed(1);
              setDelayMs(10);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              emailMode === 'bcc' && delayMs > 0
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            🚀 100/s BCC Batch
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailMode('bcc');
              setParallelSpeed(50);
              setDelayMs(0);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              emailMode === 'bcc' && delayMs === 0
                ? 'bg-gradient-to-r from-red-600 via-purple-600 to-indigo-600 text-white border-transparent shadow-md animate-pulse'
                : 'bg-slate-800 text-red-400 border-red-500/50 hover:bg-slate-700 font-extrabold'
            }`}
          >
            🔥 INSTANT BLAST (0ms • BCC)
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1 ${
              showAdvanced ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>⚙️ {showAdvanced ? 'Hide Config' : 'Tuning & Shield'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSpamGuideModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400 hover:from-emerald-600 hover:to-teal-600 shadow-xs font-extrabold"
            title="स्पैम से कैसे बचें और ज्यादा क्लाइंट रिप्लाई कैसे पाएं (हिंदी / ENG गाइड)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>💡 स्पैम फ्री गाइड (हिंदी)</span>
          </button>
        </div>
      </div>

      {/* Inline Sending Account & Mode Toolbar (Always Visible, Compact 1-Row) */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200/80 p-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          <div className="md:col-span-3 flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-700 shrink-0">Provider:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderType)}
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            >
              <option value="hotmail">🔥 Hotmail / Live (.com / .in) (smtp-mail.outlook.com : 587)</option>
              <option value="outlook">📧 Outlook / Office 365 (smtp-mail.outlook.com : 587)</option>
              <option value="gmail">📨 Gmail (App Password Required)</option>
              <option value="yahoo">🟣 Yahoo Mail</option>
              <option value="aol">🟡 AOL Mail</option>
              <option value="sendgrid">🔥 SendGrid Pro API (smtp.sendgrid.net : 587)</option>
              <option value="aws_ses">☁️ AWS SES Premium (email-smtp.us-east-1 : 587)</option>
              <option value="mailgun">🚀 Mailgun High-Deliverability (smtp.mailgun.org : 587)</option>
              <option value="brevo">⚡ Brevo / Sendinblue Relay (smtp-relay.brevo.com : 587)</option>
              <option value="smtp2go">🛡️ SMTP2GO Inbox Shield (mail.smtp2go.com : 2525)</option>
              <option value="postmark">✨ Postmark Transactional (smtp.postmarkapp.com : 587)</option>
              <option value="custom">⚙️ Custom SMTP Server</option>
              <option value="simulator">⚡ Simulator Mode (No real login)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center space-x-1.5">
            <span className="text-xs font-bold text-gray-700 shrink-0">Email:</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="karansingh929@aol.com"
              disabled={provider === 'simulator'}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="md:col-span-3 flex items-center space-x-1.5">
            <span className="text-xs font-bold text-gray-700 shrink-0">Pass:</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={provider === 'simulator' ? 'Not needed' : 'App Password / Secret'}
              disabled={provider === 'simulator'}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono tracking-wider text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="md:col-span-3 flex items-center space-x-1.5">
            <span className="text-xs font-bold text-gray-700 shrink-0">Mode:</span>
            <select
              value={emailMode}
              onChange={(e) => setEmailMode(e.target.value as EmailMode)}
              className="w-full px-2.5 py-1.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="normal">Normal (1 per mail • Personalized)</option>
              <option value="html">HTML Mode (Rich Tags • Styled)</option>
              <option value="bcc">🚀 BCC Batch (Ultra Fast • Real Mailing)</option>
            </select>
          </div>
        </div>

        {(provider === 'hotmail' || provider === 'outlook') && (
          <div className="mt-2.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 text-amber-950 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="text-base">🔥</span>
              <span><strong>Hotmail / Outlook / Live / Office 365:</strong> Automatically connected via <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">smtp-mail.outlook.com:587</code> (STARTTLS). If 2-Step Verification is active, generate an <strong>App Password</strong> in Microsoft Account Security.</span>
            </div>
          </div>
        )}

        {/* Collapsible Advanced Settings (Host, Port, Parallel Speed, Delay, Anti-Spam Shield) */}
        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-gray-200/80 space-y-3 bg-slate-50 p-3 rounded-xl">
            {provider === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">SMTP Host Domain</label>
                  <input
                    type="text"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                    placeholder="smtp.mailgun.org"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">SMTP Port</label>
                  <input
                    type="number"
                    value={customPort}
                    onChange={(e) => setCustomPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Parallel Sends (Waves):</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={parallelSpeed}
                  onChange={(e) => setParallelSpeed(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-center"
                />
              </div>

              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Delay (ms):</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-center"
                />
              </div>

              <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Anti-Spam Shield</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubject(prev => prev.includes('{') ? prev : `{Hello|Hi|Dear} {{name}} - ${prev}`);
                    setBody(prev => prev.includes('{') ? prev : `{I hope you are doing well|Hope you have a great day}.\n\n${prev}\n\n{Best Regards|Warmly|Cheers},\n${senderName || 'Paul Smith'}`);
                  }}
                  className="text-[11px] font-bold bg-white text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded hover:bg-emerald-100 transition-all shadow-2xs shrink-0"
                >
                  ✨ Inject Tags
                </button>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 bg-amber-50/80 border border-amber-200 p-2 rounded-lg flex items-center space-x-2 text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>For Gmail/Yahoo/AOL/Outlook: Always use an App Password. Real mailing is executed via direct Node SMTP stream with SPF/DKIM alignment.</span>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Recipients & Compose */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Recipients */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600 font-bold text-lg">
                <Users className="w-5 h-5" />
                <span className="text-gray-900">Recipients</span>
              </div>
              {activeRecipients.length > 0 && (
                <button
                  onClick={() => {
                    setRawEmails('');
                    setParsedRecipients([]);
                    setAvailableColumns([]);
                    if (onClearExternalRecipients) onClearExternalRecipients();
                  }}
                  className="text-xs text-gray-400 hover:text-red-600 flex items-center space-x-1 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {activeRecipients.length > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const formatted = activeRecipients.map(r => `"${r.fields?.name || 'Friend'}" <${r.email}>`).join('\n');
                    setRawEmails(formatted);
                  }}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                  title="Automatically format all email addresses as &quot;Name&quot; &lt;email@domain.com&gt;"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✨ Auto-Add Names into Textbox</span>
                </button>
              </div>
            )}

            <textarea
              value={rawEmails}
              onChange={(e) => {
                setRawEmails(e.target.value);
                if (parsedRecipients.length > 0) setParsedRecipients([]);
              }}
              rows={4}
              placeholder="dorothy@example.com&#10;lavender@yahoo.com&#10;customerservice@food.com"
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-y"
            />

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Upload Box */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-3 text-center cursor-pointer transition-all group"
            >
              <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mx-auto mb-1 transition-colors" />
              <div className="text-xs font-semibold text-gray-700 group-hover:text-blue-600">
                Upload Excel/CSV for merge fields
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                First row must be column headers
              </div>
            </div>

            {/* Detected / Auto-Extracted Merge Columns */}
            {activeRecipients.length > 0 && (
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <div className="flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Available Merge Variables ({displayColumns.length}):</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-emerald-300">
                    ✨ Smart Auto-Name Active
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {displayColumns.map((col) => (
                    <span
                      key={col}
                      onClick={() => insertVariable(col)}
                      className="px-2 py-0.5 bg-white text-blue-800 border border-blue-300 rounded text-xs font-mono font-bold cursor-pointer hover:bg-blue-600 hover:text-white transition-colors shadow-2xs flex items-center space-x-1"
                      title={`Click to insert {{${col}}} into email body`}
                    >
                      <span>+ {col}</span>
                      {col === 'name' && <span className="text-[10px] text-emerald-600 font-sans font-normal">(Auto)</span>}
                    </span>
                  ))}
                </div>

                {/* Live Auto-Extracted Names Preview Box */}
                <div className="pt-2 border-t border-blue-200/70 space-y-1">
                  <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                    <span>🧠 Smart Auto-Extracted Names (All Recipients):</span>
                    <span className="text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">{activeRecipients.length} Ready</span>
                  </div>
                  <div className="bg-white/90 rounded-lg p-2 border border-blue-200/80 max-h-48 overflow-y-auto space-y-1 text-xs font-mono shadow-inner">
                    {activeRecipients.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 p-1 rounded border border-slate-200/60 hover:bg-emerald-50/50 transition-colors">
                        <span className="text-gray-700 truncate max-w-[150px] font-semibold" title={r.email}>{r.email}</span>
                        <span className="text-blue-500 font-bold mx-1">➔</span>
                        <span className="font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 truncate shadow-2xs flex items-center gap-1" title={r.fields?.name}>
                          <span>✨</span>
                          <span>{r.fields?.name || 'Friend'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer count */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-600">
            <span>Status</span>
            <span className="text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg font-bold">
              {activeRecipients.length} recipients ready.
            </span>
          </div>
        </div>

        {/* Right Column: Compose */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200/80 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center space-x-2 text-blue-600 font-bold text-lg">
                <Mail className="w-5 h-5" />
                <span className="text-gray-900">Compose</span>
              </div>

              {
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>✨ AI Copy Assistant</span>
                </button>
              }
            </div>

            {/* Sender Name & Reply-To */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Sender Name (American Executive Style)</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Paul Smith"
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Reply-To Address (Optional)</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="Reply-To (optional)"
                    className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              {/* American Executive Name Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase mr-1">🇺🇸 US Names:</span>
                {['Paul Smith', 'David Corner', 'Michael Scott', 'Sarah Jenkins', 'Robert Boyette', 'Emily Vance'].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSenderName(name)}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                      senderName === name
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Template Selector: Plain Text vs HTML */}
            <div className="bg-gradient-to-r from-gray-50 to-indigo-50/40 p-3.5 rounded-xl border border-gray-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                  <span>⚡ Quick 1-Click Templates (Plain Text & HTML):</span>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  Zero Spam Guarantee
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('normal');
                    setSubject('Website ranking error notice');
                    setBody('Hello,\nI noticed a ranking error on your site that may deserve attention.\nCan I share a screenshot?\nThanks & regards');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-300 hover:border-blue-400 text-gray-800 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <span>📝 Plain Text 1 (Simple & Clean)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('normal');
                    setSenderName('Par Adiso');
                    setSubject('Website ranking error - {{name}}');
                    setBody('Hello {{name}}, I noticed a ranking error on your site and wanted to bring it to your attention. Can i share a screenshot? Thanks & Regards Par Adiso');
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-purple-50 border border-gray-300 hover:border-purple-400 text-gray-800 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <span>👤 Plain Text 2 (Par Adiso / Personalized)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode('html');
                    setSenderName('Par Adiso');
                    setSubject('🚨 Urgent: SEO Ranking Error Alert for {{name}}');
                    setBody('<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.6; padding: 12px; border-left: 4px solid #3b82f6; background-color: #f8fafc;">\n  <p style="margin-top: 0;">Hello <strong>{{name}}</strong>,</p>\n  <p>I noticed a <span style="color: #e53e3e; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; rounded: 4px;">ranking error</span> on your site and wanted to bring it to your attention immediately.</p>\n  <p>Can I share a quick screenshot with you so you can fix it?</p>\n  <br/>\n  <p style="margin-bottom: 0;">Thanks &amp; Regards,<br/><strong>Par Adiso</strong><br/><span style="color: #64748b; font-size: 12px;">Pro SEO Suite</span></p>\n</div>');
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>🌐 HTML Mode (Styled Alert Box)</span>
                </button>
              </div>
            </div>

            {/* Google AI Anti-Spam One-Word Unique Hash Randomizer Box */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg animate-bounce">🤖</span>
                  <div>
                    <h4 className="text-xs md:text-sm font-black text-emerald-950 flex items-center gap-1.5">
                      <span>Google AI Anti-Spam Word Randomizer (Unique Cryptographic Hash)</span>
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold shadow-2xs">ACTIVE</span>
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      हर क्लाइंट को आपका लिखा टेम्पलेट 100% सेम जाएगा, बस AI एक शब्द (जैसे error ➔ issue ➔ problem ➔ glitch) ऑटोमैटिकली बदल देगा ताकि हर ईमेल इनबॉक्स में हिट हो!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(prev => prev.includes('{{ai_word}}') ? prev : `${prev} {{ai_word}}`.trim());
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                    title="Insert {{ai_word}} in Subject"
                  >
                    <span>✨ Subject में <code className="bg-emerald-50 px-1 py-0.5 rounded text-emerald-800 font-mono">{'{{ai_word}}'}</code></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBody(prev => prev.includes('{{ai_word}}') ? prev : `${prev} {{ai_word}}`.trim());
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                    title="Insert {{ai_word}} in Body"
                  >
                    <span>✨ Body में <code className="bg-emerald-50 px-1 py-0.5 rounded text-emerald-800 font-mono">{'{{ai_word}}'}</code></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiWordPreview(!showAiWordPreview)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold transition-all shadow-xs flex items-center gap-1"
                  >
                    <span>👁️ {showAiWordPreview ? 'Hide Preview' : 'Live Client Word Preview'}</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Table showing each recipient receiving a different AI word! */}
              {showAiWordPreview && (
                <div className="bg-white/95 rounded-xl p-3 border border-emerald-300 space-y-2 animate-fade-in text-xs shadow-inner">
                  <div className="flex items-center justify-between text-gray-700 font-extrabold border-b border-gray-200 pb-1.5">
                    <span>👥 हर क्लाइंट को कौन सा AI वर्ड जाएगा (Live Variation Check):</span>
                    <span className="text-[11px] font-normal text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                      100% Unique Email Hash Guaranteed
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                    {activeRecipients.slice(0, 8).map((r, idx) => {
                      const aiWord = getAiWordForRecipient(r.email, idx, `${subject} ${body}`);
                      const previewSub = applyAiAntiSpamWord(subject || 'Business update notice', r.email, idx, true);
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 hover:bg-emerald-50/60 p-1.5 rounded border border-slate-200 transition-colors gap-1 sm:gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-gray-500 font-bold">#{idx + 1}</span>
                            <span className="font-semibold text-gray-800 truncate max-w-[140px]" title={r.email}>{r.email}</span>
                            <span className="text-gray-400">➔</span>
                            <span className="text-blue-900 font-bold truncate max-w-[180px] bg-blue-50 px-1 rounded" title={previewSub}>
                              {previewSub}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <span className="text-[10px] text-gray-500">AI Word:</span>
                            <span className="bg-emerald-100 border border-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded shadow-2xs">
                              ✨ &quot;{aiWord}&quot;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {activeRecipients.length > 8 && (
                      <div className="text-center text-gray-500 font-sans font-semibold py-1">
                        + {activeRecipients.length - 8} more clients will also receive unique AI randomized words automatically...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="note"
                className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Body */}
            <div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Hello,&#10;I noticed a ranking error on your site that may deserve attention.&#10;Can I share a screenshot?&#10;Thanks & regards"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-y leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Supports tags like <code className="text-gray-600 bg-gray-100 px-1 py-0.5 rounded font-mono">{'{{name}}'}</code></span>
              <button
                type="button"
                onClick={handleCheckSpam}
                disabled={checkingSpam || !subject || !body}
                className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-950 font-bold rounded-lg transition-all flex items-center gap-1.5 border border-emerald-300 shadow-2xs disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{checkingSpam ? 'Checking Spam Risk...' : '🛡️ Check Google AI Inbox & Spam Score'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSpamGuideModal(true)}
                className="px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200 text-amber-950 font-bold rounded-lg transition-all flex items-center gap-1.5 border border-amber-300 shadow-2xs"
              >
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>💡 स्पैम फ्री & रिप्लाई गाइड (हिंदी)</span>
              </button>
            </div>
            <span className="font-semibold">{body.length} characters</span>
          </div>

          {spamScore && (
            <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl space-y-2.5 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-extrabold text-emerald-950">Google AI Inbox & Anti-Bounce Shield Report:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    spamScore.score >= 80 ? 'bg-emerald-600 text-white' : spamScore.score >= 60 ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                  }`}>
                    Score: {spamScore.score} / 100
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                  {spamScore.status}
                </span>
              </div>
              <div className="space-y-1 pt-1.5 border-t border-emerald-200/60">
                {spamScore.suggestions.map((sug, i) => (
                  <p key={i} className="text-xs font-medium text-gray-800 flex items-start gap-1.5">
                    <span>{sug}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message if any */}
      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-2xl flex items-center justify-between text-sm animate-shake">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-xs font-bold text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {emailMode === 'bcc' && (
        <div className="mb-4 bg-purple-50 border border-purple-200 text-purple-900 px-4 py-3 rounded-xl text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-2.5">
            <span className="text-base">🚀</span>
            <div>
              <strong className="block text-purple-950 text-sm mb-0.5">BCC High-Speed Mode Note:</strong>
              <span>Since up to 25 emails are grouped into 1 SMTP delivery, tags like <code className="bg-purple-100 px-1 py-0.5 rounded font-mono font-bold">{'{name}'}</code> are replaced with <strong>Friend</strong>. For exact individual names (e.g. Karan, Kalvin), switch Mode to <strong>Normal (1 per mail)</strong> above!</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEmailMode('normal')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            Switch to Normal Mode
          </button>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleSendCampaign}
          disabled={isSending || activeRecipients.length === 0}
          className="w-full max-w-md py-4 px-8 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 text-base tracking-wide transform hover:-translate-y-0.5"
        >
          {isSending ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Sending Campaign ({sendLogs.length} / {activeRecipients.length})...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Send Campaign Now</span>
            </>
          )}
        </button>
      </div>

      {/* Real-Time Campaign Delivery Dashboard & Status Log */}
      {(sendLogs.length > 0 || isSending || statusLogFeed.length > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center space-x-2.5 text-gray-900 font-bold text-lg">
              <Activity className={`w-5 h-5 ${isSending ? 'text-blue-600 animate-pulse' : 'text-emerald-600'}`} />
              <span>Real-Time Bulk Delivery Dashboard</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isSending && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200 flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Sending Live...</span>
                </span>
              )}
              {failedCount > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>{failedCount} failed</span>
                </span>
              )}
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{sentCount} sent</span>
              </span>
            </div>
          </div>

          {/* Visual Progress Bar Section */}
          <div className="space-y-2.5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-purple-50/40 p-4 rounded-xl border border-blue-200/80 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-800 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Bulk Send Progress: {sendLogs.length} of {activeRecipients.length} Recipients Processed</span>
              </span>
              <span className="text-blue-600 font-extrabold text-sm">
                {Math.min(100, Math.round((sendLogs.length / Math.max(1, activeRecipients.length)) * 100))}%
              </span>
            </div>
            <div className="w-full bg-gray-200/80 rounded-full h-3.5 overflow-hidden border border-gray-300/50 shadow-inner p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isSending
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((sendLogs.length / Math.max(1, activeRecipients.length)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex flex-wrap justify-between items-center text-[11px] text-gray-500 pt-1 gap-2">
              <span>Mode: <strong className="text-gray-700">{emailMode.toUpperCase()}</strong> | Workers: <strong className="text-gray-700">{parallelSpeed}x</strong></span>
              <span>Delay: <strong className="text-gray-700">{delayMs}ms</strong> | Shield: <strong className="text-emerald-600 font-semibold">DKIM & Spintax Active</strong></span>
            </div>
          </div>

          {/* Real-Time Status Log / Activity Feed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-purple-600" />
                <span>Live Execution Status Log:</span>
              </span>
              {statusLogFeed.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusLogFeed([])}
                  className="text-[11px] text-gray-500 hover:text-gray-800 font-semibold underline"
                >
                  Clear Feed
                </button>
              )}
            </div>
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-xs max-h-52 overflow-y-auto shadow-inner border border-slate-800 space-y-1.5">
              {statusLogFeed.length === 0 ? (
                <div className="text-slate-500 italic py-3 text-center">
                  ⏳ Ready for bulk send execution. Status logs and timestamps will stream here in real-time...
                </div>
              ) : (
                statusLogFeed.map((log, idx) => {
                  const isTop = idx === 0 && isSending;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 py-1 px-2 rounded transition-all ${
                        isTop
                          ? 'bg-blue-950/80 border-l-2 border-blue-400 text-blue-200 font-bold animate-pulse'
                          : log.includes('❌') || log.includes('Failed') || log.includes('Error')
                          ? 'bg-red-950/40 border-l-2 border-red-500 text-red-300'
                          : log.includes('✔️') || log.includes('Delivered')
                          ? 'text-emerald-300'
                          : log.includes('🎉') || log.includes('Completed')
                          ? 'bg-emerald-950/60 border-l-2 border-emerald-400 text-emerald-200 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="shrink-0 font-semibold text-slate-400">{log.substring(0, log.indexOf(' ') !== -1 && log.startsWith('[') ? log.indexOf(']') + 1 : 0)}</span>
                      <span className="flex-1 break-words">{log.substring(log.startsWith('[') && log.indexOf(']') !== -1 ? log.indexOf(']') + 1 : 0).trim()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Results table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Recipient Address</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Server Details</th>
                  <th className="py-3 px-4 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sendLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-gray-800">{log.email}</td>
                    <td className="py-3 px-4">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{log.details}</td>
                    <td className="py-3 px-4 text-right">
                      {log.personalizedSubject && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Email Open & Read Analytics Dashboard */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2.5 text-gray-900 font-extrabold text-base">
            <span className="text-xl">📈</span>
            <span>Live Email Read & Open Tracking Dashboard</span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full uppercase">1x1 Invisible Pixel Active</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateRead}
              disabled={simulatingRead || (sendLogs.length === 0 && openStats.length === 0)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>⚡ Test Read Tracking (Demo)</span>
            </button>
            <button
              type="button"
              onClick={fetchOpenStats}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {openStats.length > 0 && (
              <button
                type="button"
                onClick={handleClearReadStats}
                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                title="Clear Analytics History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-white rounded-xl border border-indigo-100 shadow-2xs">
            <span className="text-xs font-bold text-indigo-900 uppercase">Total Emails Read</span>
            <div className="text-2xl font-black text-indigo-950 mt-1 flex items-baseline gap-2">
              <span>{openStats.length}</span>
              <span className="text-xs font-bold text-indigo-600">({totalOpens} total views)</span>
            </div>
            <p className="text-[11px] text-gray-600 mt-1">Tracks live when recipient opens mail on Gmail / Yahoo / Hotmail</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-xl border border-emerald-100 shadow-2xs">
            <span className="text-xs font-bold text-emerald-900 uppercase">Open Rate Percentage</span>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {sendLogs.filter(l => l.status === 'sent').length > 0
                ? `${Math.round((openStats.length / Math.max(1, sendLogs.filter(l => l.status === 'sent').length)) * 100)}%`
                : openStats.length > 0 ? '100%' : '0%'}
            </div>
            <p className="text-[11px] text-gray-600 mt-1">Industry average is ~22%. Target &gt;40% with personalized subject lines.</p>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-white rounded-xl border border-amber-100 shadow-2xs">
            <span className="text-xs font-bold text-amber-900 uppercase">Deliverability & Shield Status</span>
            <div className="text-base font-black text-amber-950 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Inbox & Anti-Spam Shield</span>
            </div>
            <p className="text-[11px] text-gray-600 mt-1">1-Click Unsubscribe headers & DKIM format enabled</p>
          </div>
        </div>

        {openStats.length === 0 ? (
          <div className="p-6 bg-gray-50/70 border border-dashed border-gray-200 rounded-xl text-center text-gray-500 space-y-2">
            <p className="text-xs font-semibold">📭 No email opens recorded yet.</p>
            <p className="text-[11px] text-gray-400 max-w-md mx-auto">When recipients open your emails, the invisible 1x1 tracking pixel will ping this dashboard automatically. Click <strong>"⚡ Test Read Tracking (Demo)"</strong> above to test how it looks!</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Recipient Email</th>
                  <th className="py-2.5 px-4">Read Count</th>
                  <th className="py-2.5 px-4">Last Opened At</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openStats.map((ev) => (
                  <tr key={`${ev.id}_${ev.email}`} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-950">{ev.email}</td>
                    <td className="py-2.5 px-4 font-bold text-gray-800">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">{ev.count} times</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 font-mono">
                      {new Date(ev.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        <span>📖 Read / Opened</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal to view personalized email preview */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Personalized Message Preview</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>To: <strong className="text-gray-800 font-mono">{selectedLog.email}</strong></span>
                <span>Status: <strong className="text-emerald-600 uppercase font-bold">{selectedLog.status}</strong></span>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 font-bold text-gray-800">
                Subject: {selectedLog.personalizedSubject}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                {selectedLog.personalizedBody}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Copy Assistant Modal */}
      <AiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyCopy={(newSubject, newBody, suggestedName) => {
          setSubject(newSubject);
          setBody(newBody);
          if (suggestedName) {
            setSenderName(suggestedName);
          }
        }}
        availableColumns={availableColumns}
      />

      {/* Anti-Spam Delivery & High Reply Guide Modal (Hindi / ENG) */}
      {showSpamGuideModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <BookOpen className="w-7 h-7 text-yellow-300 shrink-0" />
                  <div>
                    <h3 className="text-lg font-black tracking-wide">🛡️ एंटी-स्पैम डिलीवरी & हाई-रिप्लाई गाइड (हिंदी / ENG)</h3>
                    <p className="text-xs text-emerald-100 font-medium mt-0.5">
                      Gmail और Custom Domain से 100% Inbox Placement और ज्यादा से ज्यादा क्लाइंट रिप्लाई पाने के गुरुमंत्र
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSpamGuideModal(false)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-gray-800 text-xs md:text-sm leading-relaxed">
              {/* Section 1: Gmail to Gmail */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                <h4 className="font-extrabold text-amber-900 text-sm flex items-center gap-2 border-b border-amber-200/80 pb-2">
                  <span>📨 1. Gmail से Gmail स्पैम फ्री कैसे भेजें (Zero Spam Rules for Gmail)</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-amber-950 font-medium text-xs">
                  <li><strong>App Password का ही उपयोग करें:</strong> सामान्य जीमेल पासवर्ड से ईमेल ब्लॉक हो जाते हैं। Google Account Settings &gt; 2-Step Verification &gt; App Passwords से 16 अक्षरों का पासवर्ड बनाएं।</li>
                  <li><strong>🤖 Google AI One-Word Randomizer (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">{'{{ai_word}}'}</code>):</strong> हमारा नया AI फीचर हर क्लाइंट के लिए आपके टेम्पलेट का सिर्फ एक शब्द (जैसे: error ➔ issue ➔ problem ➔ 1st page error) ऑटोमैटिकली बदल देता है! इससे Google AI को हर ईमेल का क्रिप्टोग्राफिक हैश 100% यूनिक लगता है और आपका ईमेल कभी स्पैम में नहीं जाता, सीधा Primary Inbox में लैंड होता है!</li>
                  <li><strong>Spintax (स्पिंटैक्स) का प्रयोग करें:</strong> अगर आप 50 लोगों को बिल्कुल एक जैसा टेक्स्ट भेजेंगे तो Google उसे स्पैम या Promotions में डाल देगा! सब्जेक्ट और बॉडी में <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">{'{Hello|Hi|Dear} {{name}}'}</code> जैसे वेरिएशंस का उपयोग करें।</li>
                  <li><strong>Anti-Spam Delay (इंटर-बैच डिले):</strong> &quot;Tuning &amp; Shield&quot; सेटिंग्स में जाकर 10 से 30 सेकंड का डिले (Delay) रखें। इससे ईमेल मानव (Human-like speed) की तरह जाते हैं और अकाउंट कभी सस्पेंड नहीं होता।</li>
                  <li><strong>डेली लिमिट:</strong> एक जीमेल आईडी से दिन में 50 से 100 कोल्ड ईमेल से ज्यादा न भेजें।</li>
                </ul>
              </div>

              {/* Section 2: Custom Domain */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                <h4 className="font-extrabold text-blue-900 text-sm flex items-center gap-2 border-b border-blue-200/80 pb-2">
                  <span>🌐 2. Custom Domain / SMTP से स्पैम फ्री कैसे भेजें (Domain Authority Rules)</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-blue-950 font-medium text-xs">
                  <li><strong>SPF, DKIM और DMARC रिकॉर्ड्स:</strong> अपने डोमेन (GoDaddy, Hostinger, Cloudflare) के DNS में यह 3 रिकॉर्ड्स जरूर सेट करें। यह साबित करता है कि ईमेल असली डोमेन से भेजा जा रहा है।</li>
                  <li><strong>Bounce Rate 2% से कम रखें:</strong> गलत या बंद ईमेल आईडी पर ईमेल भेजने से डोमेन खराब होता है। हमेशा भेजने से पहले हमारे <strong>&quot;Verify&quot;</strong> टैब से ईमेल लिस्ट को चेक करें!</li>
                  <li><strong>क्लीन सेंडर नेम (Clean Sender Name):</strong> हमारा ऐप अब ऑटोमैटिकली ईमेल को <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono font-bold">&quot;Client Name&quot; &lt;email@domain.com&gt;</code> फॉर्मेट में बदल देता है जिससे ईमेल ट्रस्टेड लगता है और इनबॉक्स में जाता है।</li>
                </ul>
              </div>

              {/* Section 3: High Replies */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                <h4 className="font-extrabold text-emerald-900 text-sm flex items-center gap-2 border-b border-emerald-200/80 pb-2">
                  <span>🚀 3. ज्यादा से ज्यादा क्लाइंट पॉजिटिव रिप्लाई पाने के 5 गुरुमंत्र (5 Secrets for Maximum Replies)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-emerald-950 font-medium text-xs">
                  <li><strong>नाम से व्यक्तिगत संबोधन (Personalization):</strong> पहली ही लाइन में <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono font-bold">{'{{name}}'}</code> या <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono font-bold">{'{{company}}'}</code> का उपयोग करें। जब क्लाइंट अपना नाम देखता है, तो रिप्लाई करने की संभावना 80% बढ़ जाती है।</li>
                  <li><strong>स्पैम शब्दों (Spam Words) से बचें:</strong> सब्जेक्ट में कभी भी <i>&quot;100% Free&quot;, &quot;$$$&quot;, &quot;Guaranteed&quot;, &quot;Urgent&quot;</i> या <i>ALL CAPS</i> का प्रयोग न करें। भेजने से पहले हमारे <strong>&quot;🛡️ Check Google AI Inbox &amp; Spam Score&quot;</strong> बटन से स्कोर चेक करें (80+ स्कोर रखें)!</li>
                  <li><strong>छोटा और स्पष्ट मैसेज (3-4 Lines Max):</strong> क्लाइंट के पास लंबा भाषण पढ़ने का समय नहीं होता। उनकी समस्या (Pain Point) और आपके समाधान को सिर्फ 3 लाइनों में लिखें।</li>
                  <li><strong>सॉफ्ट कॉल-टू-एक्शन (Soft CTA):</strong> पहली ईमेल में कभी भी पैसे या 30 मिनट की मीटिंग न मांगें! सिर्फ यह पूछें:<br/>
                    <span className="italic bg-white/80 px-2 py-1 rounded border border-emerald-300 inline-block mt-1 font-bold text-emerald-800">&quot;क्या मैं आपकी वेबसाइट/बिज़नेस की एक 1-मिनट की क्विक वीडियो रिपोर्ट शेयर कर सकता हूँ?&quot; (Can I share a quick 1-minute video audit?)</span><br/>
                    इससे क्लाइंट बिना किसी हिचकिचाहट के &quot;Yes&quot; में रिप्लाई करता है!
                  </li>
                  <li><strong>तुरंत रिप्लाई (Auto-Reply Assistant):</strong> जब कोई क्लाइंट रिप्लाई करे, तो हमारे <strong>&quot;AI Auto-Reply&quot;</strong> टैब का उपयोग करके 5 मिनट के अंदर प्रोफेशनल जवाब भेजें!</li>
                </ol>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowSpamGuideModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                समझ गया (Got It! Let&apos;s Send Spam-Free Emails) 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

