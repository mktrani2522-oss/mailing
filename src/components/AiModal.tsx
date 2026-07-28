import React, { useState } from 'react';
import { Sparkles, X, Loader2, Check, Copy, ArrowRight, Globe, User } from 'lucide-react';

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCopy: (subject: string, body: string, suggestedName?: string) => void;
  availableColumns: string[];
}

export const AiModal: React.FC<AiModalProps> = ({
  isOpen,
  onClose,
  onApplyCopy,
  availableColumns,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'hindi'>('generate');
  
  // Standard Generator State
  const [prompt, setPrompt] = useState('Write a cold sales outreach email proposing website SEO audit and ranking improvements.');
  const [tone, setTone] = useState('Professional & Concise');
  const [purpose, setPurpose] = useState('Cold Outreach / B2B Sales');
  
  // Hindi Converter State
  const [hindiText, setHindiText] = useState('नमस्ते सर, आपकी वेबसाइट पर कुछ एसईओ गलतियाँ हैं। क्या मैं आपको रिपोर्ट भेज सकता हूँ? धन्यवाद।');
  const [hindiSubject, setHindiSubject] = useState('SEO ranking error');
  const [targetTone, setTargetTone] = useState('Executive & Direct American Business English');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [generated, setGenerated] = useState<{ subject: string; body: string; suggestedName?: string } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          tone,
          purpose,
          fieldsAvailable: availableColumns.length > 0 ? availableColumns : ['name', 'company', 'website'],
          useThinking: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate copy');
      }

      setGenerated({
        subject: data.subject || 'Quick follow up',
        body: data.body || '',
      });
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI service');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertHindi = async () => {
    if (!hindiText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai/convert-hindi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: hindiText,
          subject: hindiSubject,
          targetTone,
          useThinking: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert text');
      }

      setGenerated({
        subject: data.subject || 'Business Collaboration Proposal',
        body: data.body || '',
        suggestedName: data.suggestedName || 'Paul Smith',
      });
    } catch (err: any) {
      setError(err.message || 'Error converting Hindi/Hinglish text');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generated) {
      onApplyCopy(generated.subject, generated.body, generated.suggestedName);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            <h3 className="text-lg font-bold">Gemini AI Email Copy Assistant</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 pt-3 space-x-4">
          <button
            onClick={() => { setActiveTab('generate'); setGenerated(null); setError(''); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeTab === 'generate'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>✨ Generate from Scratch</span>
          </button>
          <button
            onClick={() => { setActiveTab('hindi'); setGenerated(null); setError(''); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
              activeTab === 'hindi'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-500" />
            <span>🇮🇳 Hindi/Hinglish ➔ 🇺🇸 American English</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {activeTab === 'generate' ? (
            <>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 text-xs text-purple-900">
                💡 <strong>Tip:</strong> Gemini will automatically insert personalized Handlebars tags like{' '}
                {availableColumns.length > 0
                  ? availableColumns.map(c => `{{${c}}}`).join(', ')
                  : '{{name}}, {{company}}'}{' '}
                if relevant to your prompt.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    What is this campaign about?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="e.g. Offering custom software consulting to e-commerce store owners..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Tone of Voice
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="Professional & Concise">Professional & Concise</option>
                      <option value="Friendly & Conversational">Friendly & Conversational</option>
                      <option value="Direct & Urgent">Direct & Urgent</option>
                      <option value="Enthusiastic & Persuasive">Enthusiastic & Persuasive</option>
                      <option value="Formal & Executive">Formal & Executive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Campaign Purpose
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    >
                      <option value="Cold Outreach / B2B Sales">Cold Outreach / B2B Sales</option>
                      <option value="Follow-up Reminder">Follow-up Reminder</option>
                      <option value="Product Launch / Feature Update">Product Launch / Feature Update</option>
                      <option value="Webinar / Event Invitation">Webinar / Event Invitation</option>
                      <option value="Feedback / Review Request">Feedback / Review Request</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Drafting Personalized Copy...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Campaign Copy with Gemini</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 leading-relaxed">
                🇮🇳 ➔ 🇺🇸 <strong>Hindi / Hinglish Converter:</strong> Paste your draft in Hindi, Hinglish, or rough English. Gemini will convert it into high-converting American Corporate English and suggest a classic US sender name (like <em>Paul Smith</em> or <em>David Corner</em>).
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Your Hindi / Hinglish / Draft Text
                  </label>
                  <textarea
                    value={hindiText}
                    onChange={(e) => setHindiText(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. नमस्ते सर, आपकी वेबसाइट पर कुछ एसईओ गलतियाँ हैं। क्या मैं आपको रिपोर्ट भेज सकता हूँ?"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Original Subject Line (Optional)
                    </label>
                    <input
                      type="text"
                      value={hindiSubject}
                      onChange={(e) => setHindiSubject(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="SEO ranking error"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Target American Tone
                    </label>
                    <select
                      value={targetTone}
                      onChange={(e) => setTargetTone(e.target.value)}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Executive & Direct American Business English">Executive & Direct US Business English</option>
                      <option value="Warm & Consultative B2B Sales">Warm & Consultative B2B Sales</option>
                      <option value="Concise Silicon Valley Tech Style">Concise Silicon Valley Tech Style</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleConvertHindi}
                  disabled={loading || !hindiText.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Converting to American English & Name...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-5 h-5" />
                      <span>Convert to American English & Suggest Name</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Generated Result */}
          {generated && (
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Generated Result
                </span>
                <span className="text-xs text-green-700 font-medium flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ready to insert</span>
                </span>
              </div>

              {generated.suggestedName && (
                <div className="flex items-center space-x-2 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-950">
                  <User className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Suggested American Sender Name: <strong className="text-indigo-900 font-bold">{generated.suggestedName}</strong></span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Subject Line:</label>
                <div className="p-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold text-gray-800">
                  {generated.subject}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Email Body:</label>
                <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                  {generated.body}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setGenerated(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleApply}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all"
                >
                  <span>Use This Copy & Name</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
