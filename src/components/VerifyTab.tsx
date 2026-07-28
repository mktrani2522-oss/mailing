import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Search, Download, ArrowRight, RefreshCw, Upload, Sparkles } from 'lucide-react';
import Papa from 'papaparse';
import { VerificationResult, Recipient } from '../types';
import { extractNameFromEmail, parseEmailAndName } from '../lib/nameExtractor';

interface VerifyTabProps {
  onTransferToMerge: (recipients: Recipient[]) => void;
}

const SAMPLE_EMAILS = [
  'dorothy@dorothychengjewelry.com',
  'lavenderbeefarm@yahoo.com',
  'customerservice@yixhifoods.com',
  'servicetreecare@yahoo.com',
  'rboyette@aapcogroup.com',
  'test.user@mailinator.com',
  'admin@example.com',
  'invalid.syntax.email',
  'support@google.com',
  'temp-mail-user@guerrillamail.com',
];

export const VerifyTab: React.FC<VerifyTabProps> = ({ onTransferToMerge }) => {
  const [inputEmails, setInputEmails] = useState<string>(SAMPLE_EMAILS.join('\n'));
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'valid' | 'risky' | 'invalid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle CSV/TXT file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          if (res.data && res.data.length > 0) {
            const headers = res.meta.fields || [];
            const emailCol = headers.find(h => /^email|mail|e-mail$/i.test(h.trim())) || headers[0];
            const emails = res.data
              .map((row: any) => row[emailCol]?.trim())
              .filter(Boolean);
            setInputEmails(emails.join('\n'));
          }
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          setInputEmails(lines.join('\n'));
        }
      };
      reader.readAsText(file);
    }
  };

  // Run bulk verification
  const handleStartVerification = async () => {
    const lines = inputEmails
      .split(/\r?\n|,/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      alert('Please enter at least one email address to verify.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    setResults([]);

    try {
      const response = await fetch('/api/verify-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: lines }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed on server');
      }

      if (data.results) {
        setResults(data.results);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to communicate with verification server.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter and search results
  const filteredResults = React.useMemo(() => {
    return results.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (searchQuery && !item.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [results, filter, searchQuery]);

  // Statistics
  const validCount = results.filter(r => r.status === 'valid').length;
  const riskyCount = results.filter(r => r.status === 'risky').length;
  const invalidCount = results.filter(r => r.status === 'invalid').length;

  // Export CSV
  const handleExportCsv = (onlyValid: boolean = false) => {
    const targetList = onlyValid ? results.filter(r => r.status === 'valid') : results;
    if (targetList.length === 0) {
      alert('No results available to export.');
      return;
    }

    const csv = Papa.unparse(
      targetList.map((r) => ({
        Email: r.email,
        Status: r.status.toUpperCase(),
        Reason: r.reason,
        Disposable: r.isDisposable ? 'Yes' : 'No',
        RoleAccount: r.isRoleAccount ? 'Yes' : 'No',
        FreeProvider: r.isFreeProvider ? 'Yes' : 'No',
        MX_Records: r.mxRecords.join('; '),
      }))
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `verified-emails-${onlyValid ? 'valid-only' : 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Transfer valid to Mail Merge
  const handleTransfer = () => {
    const validRecips: Recipient[] = results
      .filter(r => r.status === 'valid' || r.status === 'risky')
      .map(r => {
        const parsed = parseEmailAndName(r.email);
        return { email: parsed.email || r.email, fields: { name: parsed.name } };
      });

    if (validRecips.length === 0) {
      alert('No valid or risky emails to send to Mail Merge.');
      return;
    }

    onTransferToMerge(validRecips);
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 py-3 space-y-3 animate-fade-in">
      {/* Compact Horizontal Title Strip */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 text-blue-800 p-2 rounded-lg border border-blue-200 shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Bulk Email Verifier Engine</h1>
            <p className="text-xs text-gray-500">
              Verify syntax, detect role-based shared inboxes, flag disposable mail, & check live DNS MX records.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-xs font-bold shrink-0">
          <button
            onClick={() => setInputEmails(SAMPLE_EMAILS.join('\n'))}
            className="text-blue-600 hover:text-blue-800 underline font-extrabold"
          >
            Load Sample ({SAMPLE_EMAILS.length})
          </button>
          <label className="cursor-pointer text-gray-700 hover:text-gray-900 flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors border border-gray-300/80 shadow-2xs">
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload CSV / TXT</span>
            <input type="file" onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Widescreen Grid */}
      <div className={`grid grid-cols-1 ${results.length > 0 ? 'lg:grid-cols-12' : ''} gap-4`}>
        {/* Input Section */}
        <div className={`${results.length > 0 ? 'lg:col-span-4' : 'max-w-3xl mx-auto w-full'} bg-white rounded-2xl shadow-xs border border-gray-200/80 p-4 flex flex-col justify-between space-y-3`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-sm font-extrabold text-gray-900 flex items-center space-x-2">
                <span>Enter Email Addresses to Scan</span>
              </span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {inputEmails.split(/\r?\n|,/).filter(l => l.trim()).length} emails
              </span>
            </div>

            <textarea
              value={inputEmails}
              onChange={(e) => setInputEmails(e.target.value)}
              rows={results.length > 0 ? 10 : 6}
              placeholder="Paste email addresses here (one per line)..."
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-300 rounded-xl text-xs font-mono text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-y leading-relaxed"
            />

            {errorMessage && (
              <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                {errorMessage}
              </div>
            )}
          </div>

          <button
            onClick={handleStartVerification}
            disabled={isVerifying || !inputEmails.trim()}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm tracking-wide transform hover:-translate-y-0.5 mt-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning DNS MX...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Start Real-Time Verification</span>
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="lg:col-span-8 space-y-3 animate-fade-in flex flex-col">
            {/* Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setFilter('all')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                filter === 'all' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Scanned</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{results.length}</div>
            </div>

            <div
              onClick={() => setFilter('valid')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                filter === 'valid' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Valid MX</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">{validCount}</div>
            </div>

            <div
              onClick={() => setFilter('risky')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                filter === 'risky' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-gray-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Risky / Role</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-700 mt-1">{riskyCount}</div>
            </div>

            <div
              onClick={() => setFilter('invalid')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                filter === 'invalid' ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20' : 'border-gray-200 hover:border-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Invalid / Bounce</span>
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-extrabold text-red-700 mt-1">{invalidCount}</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-4 space-y-3">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search verified emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  onClick={() => handleExportCsv(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                  title="Export only valid emails as CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>Valid ({validCount})</span>
                </button>

                <button
                  onClick={() => handleExportCsv(false)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                  title="Export all verification results"
                >
                  <Download className="w-3 h-3" />
                  <span>All ({results.length})</span>
                </button>

                <button
                  onClick={handleTransfer}
                  disabled={validCount + riskyCount === 0}
                  className="flex items-center space-x-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
                  title="Send verified emails directly to Mail Merge tab"
                >
                  <span>To Merge ({validCount + riskyCount})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-y-auto max-h-[380px] border border-gray-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">✨ Auto-Detected Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reason / Diagnostics</th>
                    <th className="py-3 px-4">MX Mail Server</th>
                    <th className="py-3 px-4 text-right">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">
                        No verification results match your current filter or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((item) => (
                      <tr key={item.email} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{item.email}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-800">
                          <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-sans font-bold shadow-2xs inline-flex items-center gap-1">
                            <span>✨</span>
                            <span>{parseEmailAndName(item.email).name}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.status === 'valid' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          )}
                          {item.status === 'risky' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Risky</span>
                            </span>
                          )}
                          {item.status === 'invalid' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-bold border border-red-200">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>Invalid</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700 font-medium max-w-sm">{item.reason}</td>
                        <td className="py-3.5 px-4 font-mono text-gray-600 truncate max-w-xs">
                          {item.mxRecords.length > 0 ? item.mxRecords[0] : <span className="text-red-500 font-semibold">None detected</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {item.isDisposable && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">
                                Disposable
                              </span>
                            )}
                            {item.isRoleAccount && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                Role
                              </span>
                            )}
                            {item.isFreeProvider && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                                Free Mail
                              </span>
                            )}
                            {!item.isDisposable && !item.isRoleAccount && !item.isFreeProvider && (
                              <span className="text-gray-400 font-mono text-[10px]">Corporate</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
