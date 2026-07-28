import React, { useState } from 'react';
import { Sparkles, MessageSquare, Send, Copy, Check, User, Globe, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface ReplyVariation {
  id: string;
  title: string;
  subject: string;
  body: string;
}

interface AutoReplyTabProps {
  onSwitchToMerge?: () => void;
}

export const AutoReplyTab: React.FC<AutoReplyTabProps> = ({ onSwitchToMerge }) => {
  const [incomingMessage, setIncomingMessage] = useState(
    'Bhai report bhej do aur pricing bata do, agar sahi raha to kal hi start karte hain project.'
  );
  const [intent, setIntent] = useState('Send pricing and book a 5-minute Zoom call immediately');
  const [senderName, setSenderName] = useState('Paul Smith');
  const [companyName, setCompanyName] = useState('Pro SEO & Tech Consulting Suite');
  const [language, setLanguage] = useState('Executive American Business English & Hinglish Closer');
  const [useThinking, setUseThinking] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('client.lead@company.com');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replies, setReplies] = useState<ReplyVariation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sampleMessages = [
    {
      label: '🚨 Ranking Error Response (Client says Yes)',
      text: 'Hello Mkt Rani, I noticed a ranking error on your site and wanted to bring it to your attention. Can i share a screenshot? Thanks & Regards Par Adiso -- [CLIENT REPLY]: Yes sure, send over the screenshot immediately.',
      intent: 'Attach audit screenshot and suggest immediate 5-min fix consultation',
    },
    {
      label: '🇮🇳 Hindi/Hinglish Pricing Inquiry',
      text: 'Bhai report bhej do aur pricing bata do, agar sahi raha to kal hi start karte hain project.',
      intent: 'Send pricing summary and book immediate Zoom call',
    },
    {
      label: '🇺🇸 Interested Executive Lead',
      text: 'Yes, please send over the audit screenshot and let me know your availability this week.',
      intent: 'Share audit overview and propose 2 time slots for call',
    },
    {
      label: '❓ Technical Question',
      text: 'How do you guarantee our domain ranking without risking Google penalties or spam flags?',
      intent: 'Reassure 100% white-hat organic SEO and invite for live demo',
    },
    {
      label: '👋 Hesitant Prospect',
      text: 'We are currently working with an agency, maybe check back in 3 months.',
      intent: 'Politely offer a free second-opinion audit without breaking current contract',
    },
  ];

  const handleGenerate = async () => {
    if (!incomingMessage.trim()) return;
    setLoading(true);
    setError('');
    setReplies([]);
    setSentId(null);

    try {
      const response = await fetch('/api/ai/magic-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomingMessage,
          intent,
          senderName,
          companyName,
          language,
          useThinking,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Google Magic Auto-Reply');
      }

      if (data.replies && Array.isArray(data.replies)) {
        setReplies(data.replies);
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Google Magic AI Assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleRealSend = async (rep: ReplyVariation) => {
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      alert('⚠️ Please enter a valid Recipient / Client Email address in the box above first!');
      return;
    }
    setSendingId(rep.id);
    try {
      const provider = localStorage.getItem('mm_provider') || 'gmail';
      const email = localStorage.getItem('mm_email') || 'mackmc222@gmail.com';
      const password = localStorage.getItem('mm_password') || 'app-password-demo';
      const customHost = localStorage.getItem('mm_customHost') || 'smtp.example.com';
      const customPort = Number(localStorage.getItem('mm_customPort')) || 587;

      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: { provider, email, password, host: customHost, port: customPort },
          mode: 'normal',
          speed: { delayMs: 0, parallel: 1 },
          compose: {
            senderName: senderName || 'Paul Smith',
            replyTo: email,
            subject: rep.subject,
            body: rep.body,
            isHtml: false,
          },
          recipients: [
            { email: recipientEmail.trim(), fields: { name: recipientEmail.split('@')[0] } }
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      setSentId(rep.id);
      alert(`🚀 Magic Reply Sent successfully to ${recipientEmail}!\n[Delivered via ${provider === 'simulator' ? 'Simulator Shield' : provider.toUpperCase() + ' SMTP'}]`);
    } catch (err: any) {
      alert(`❌ Error sending email: ${err.message || 'Check your SMTP password in Mail Merge tab!'}`);
    } finally {
      setSendingId(null);
    }
  };

  const handleUseInMerge = (rep: ReplyVariation) => {
    localStorage.setItem('mm_subject', rep.subject);
    localStorage.setItem('mm_body', rep.body);
    if (onSwitchToMerge) {
      onSwitchToMerge();
    } else {
      alert('📋 Copied to Mail Merge Template! Click the "📧 Mail Merge Pro" tab above to send to your full list.');
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-3 space-y-3 animate-fade-in">
      {/* Compact Horizontal Header Strip */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-50 text-purple-800 p-2 rounded-lg border border-purple-200 shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
              ✨ Google Magic Auto-Reply & Client Closer
            </h1>
            <p className="text-xs text-gray-500">
              Paste client reply &rarr; Google Magic AI crafts 3 high-converting executive responses ready to send in 1 click!
            </p>
          </div>
        </div>
        <div className="inline-flex items-center space-x-1.5 bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-xs font-bold border border-purple-200 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Magic Engine v3.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Input Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-gray-200/80 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm">
              <MessageSquare className="w-4 h-4" />
              <span className="text-gray-900">Incoming Client Message</span>
            </div>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ⚡ 0ms Delay Ready
            </span>
          </div>

          {/* Sample Message Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              Quick Test Examples:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sampleMessages.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIncomingMessage(sample.text);
                    setIntent(sample.intent);
                  }}
                  className="px-2.5 py-1 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-900 rounded-lg text-xs font-medium transition-all text-left truncate max-w-[220px]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Client Reply Text:
            </label>
            <textarea
              rows={4}
              value={incomingMessage}
              onChange={(e) => setIncomingMessage(e.target.value)}
              placeholder="Paste incoming client email here..."
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Reply Goal */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Reply Goal / Closing Intent:
            </label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Book 5-min Zoom call and send quote"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Sender & Offer Setup */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Your Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Paul Smith"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Offer / Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Pro SEO & Tech Consulting"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-indigo-700 mb-1">📧 Client Email (to Send)</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client.lead@company.com"
                className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-lg text-sm font-semibold text-indigo-950 focus:bg-white"
              />
            </div>
          </div>

          {/* High Thinking Mode Toggle */}
          <div className="flex items-center justify-between p-3 bg-purple-50/80 border border-purple-200/80 rounded-xl">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-950 block">🧠 High Thinking Mode (Gemini 3.1 Pro)</span>
                <span className="text-[11px] text-purple-700">Deep strategic reasoning for complex pricing & objections</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useThinking}
                onChange={(e) => setUseThinking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !incomingMessage.trim()}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Google Magic AI Thinking...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>✨ Generate 3 Magic Auto-Replies</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Output Variations */}
        <div className="lg:col-span-7 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium">
              ❌ {error}
            </div>
          )}

          {replies.length === 0 && !loading && !error && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center space-y-3">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-800">Ready for Magic Auto-Reply</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Click the button on the left to let Gemini synthesize executive American English and bilingual closing variations instantly.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl border border-purple-200 p-12 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-purple-900 animate-pulse">
                Synthesizing persuasive, zero-delay sales closing responses...
              </p>
            </div>
          )}

          {replies.length > 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>✨ 3 Ready-to-Send Magic Variations</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    Anti-Spam Shielded
                  </span>
                </h2>
                <span className="text-xs text-gray-500 font-medium">Click & Send Directly to Inbox</span>
              </div>

              {replies.map((rep) => {
                const isCopied = copiedId === rep.id;
                const isSent = sentId === rep.id;

                return (
                  <div
                    key={rep.id}
                    className={`bg-white rounded-2xl border p-6 transition-all shadow-sm hover:shadow-md space-y-4 ${
                      isSent
                        ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
                        : 'border-gray-200/80 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-900 text-xs font-bold rounded-lg border border-purple-200">
                          {rep.title}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold truncate max-w-[200px]">
                          {rep.subject}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <button
                          onClick={() => handleCopy(rep.id, `Subject: ${rep.subject}\n\n${rep.body}`)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-600" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleUseInMerge(rep)}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 border border-purple-200"
                          title="Copy this subject and body to Mail Merge tab template"
                        >
                          <span>📋 Use in Mail Merge</span>
                        </button>
                        <button
                          onClick={() => handleRealSend(rep)}
                          disabled={sendingId === rep.id}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shadow-xs disabled:opacity-50 ${
                            isSent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {sendingId === rep.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : isSent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Sent to Client!</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>⚡ Send Real Reply</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/60 font-sans text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {rep.body}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Zero-Spam Headers & Spintax Active</span>
                      </span>
                      <span>Sender: <strong className="text-gray-700">{senderName}</strong> ({companyName})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
