import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldQuestion, 
  Search, 
  RefreshCcw, 
  ExternalLink, 
  CheckCircle2, 
  History,
  FileText,
  Mail,
  Bug,
  Globe,
  Settings,
  AlertTriangle,
  XCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8000';

interface ScanResult {
  site: string;
  check: string;
  status: string;
  details: string;
}

interface ScanHistoryItem {
  id: string;
  site: string;
  timestamp: number;
  score: number;
  results: ScanResult[];
}

const DEFAULT_HISTORY: ScanHistoryItem[] = [
  { 
    id: 'demo-1',
    site: 'https://example.com', 
    timestamp: Date.now() - 600000,
    score: 85,
    results: [
      { site: 'https://example.com', check: 'HTTPS Check', status: 'PASS', details: 'Secure connection verified' },
      { site: 'https://example.com', check: 'SITEMAP', status: 'FAIL', details: 'No sitemap found at /sitemap.xml' },
      { site: 'https://example.com', check: 'ROBOTS', status: 'PASS', details: 'Robots.txt is correctly configured' },
      { site: 'https://example.com', check: 'Noindex Tag', status: 'PASS', details: 'Indexing is permitted' },
      { site: 'https://example.com', check: 'Template Email', status: 'PASS', details: 'No exposed credentials or plain emails found' },
      { site: 'https://example.com', check: 'Google Analytics', status: 'WARNING', details: 'Old version of GA detected' }
    ]
  }
];

function App() {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('scan');
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [latestResults, setLatestResults] = useState<ScanHistoryItem | null>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('site_scan_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        setHistory(DEFAULT_HISTORY);
      }
    } else {
      setHistory(DEFAULT_HISTORY);
    }
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('site_scan_history', JSON.stringify(history));
    }
  }, [history]);

  const calculateScore = (results: ScanResult[]) => {
    let score = 100;
    const fails = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;
    
    score -= (fails * 20);
    score -= (warnings * 5);
    
    return Math.max(0, Math.min(100, score));
  };

  const startScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsScanning(true);
    setError(null);
    setLatestResults(null);
    
    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
    }

    try {
      const response = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Scan failed. Ensure the backend is running.');
      }

      const results: ScanResult[] = await response.json();
      const score = calculateScore(results);
      
      const newScan: ScanHistoryItem = {
        id: Date.now().toString(),
        site: targetUrl,
        timestamp: Date.now(),
        score,
        results
      };

      setHistory(prev => [newScan, ...prev].slice(0, 50));
      setLatestResults(newScan);
      
    } catch (err: any) {
      setError(err.message || 'Connection error. Check backend server.');
    } finally {
      setIsScanning(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear your local scan history?')) {
      setHistory([]);
      localStorage.removeItem('site_scan_history');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  };

  const getStatusIcon = (status: string) => {
    switch(status.toUpperCase()) {
      case 'PASS': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'FAIL': return <XCircle className="w-5 h-5 text-danger" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <ShieldQuestion className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCheckIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('index')) return <Search className="w-4 h-4" />;
    if (n.includes('emailjs')) return <RefreshCcw className="w-4 h-4" />; // EmailJS distinct icon
    if (n.includes('mail') || n.includes('email')) return <Mail className="w-4 h-4" />;
    if (n.includes('https') || n.includes('shield')) return <Globe className="w-4 h-4" />;
    if (n.includes('ga') || n.includes('analytics') || n.includes('tag')) return <Settings className="w-4 h-4" />;
    return <Bug className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 selection:text-white pb-20">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveTab('scan')}>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Checker</span>
          </div>
          
          <div className="flex items-center gap-6">
            {['scan', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-bold capitalize transition-colors ${activeTab === tab ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
            <div className="w-px h-4 bg-border" />
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Settings className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'scan' && (
            <motion.div 
              key="scan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="text-center space-y-4 max-w-2xl mx-auto py-4">
                <motion.h1 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-5xl font-extrabold tracking-tight leading-tight"
                >
                  Verify Your <span className="gradient-text">Site Readiness</span>
                </motion.h1>
                <p className="text-gray-400 text-lg">
                  Instantly scan for <span className="text-white font-medium">SEO blockers</span>, <span className="text-white font-medium">email misconfigs</span>, 
                  and <span className="text-white font-medium">tracking errors</span> before launch.
                </p>
              </div>

              {/* Input Area */}
              <div className="max-w-3xl mx-auto">
                <form onSubmit={startScan} className="relative group">
                  <div className="absolute inset-0 bg-accent/20 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity rounded-[3rem]" />
                  <div className={`relative flex p-2 rounded-2xl bg-card border ${error ? 'border-danger' : 'border-border'} focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-all shadow-2xl`}>
                    <div className="flex items-center pl-4 text-gray-500">
                      <Globe className="w-6 h-6" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Enter website URL (e.g. google.com)"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 py-3 placeholder:text-gray-600"
                    />
                    <button 
                      disabled={isScanning}
                      className="px-8 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCcw className="w-5 h-5 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Start Scan
                        </>
                      )}
                    </button>
                  </div>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </motion.div>
                  )}
                </form>
              </div>

              {/* Active Scan Results */}
              {latestResults && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8"
                >
                  <div className="lg:col-span-1 space-y-6">
                    <div className="p-8 rounded-3xl glass text-center space-y-4">
                      <div className="relative inline-block">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-white/5" />
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" 
                            strokeDasharray={364} 
                            strokeDashoffset={364 - (364 * latestResults.score) / 100}
                            className={`transition-all duration-1000 ${latestResults.score > 80 ? 'text-success' : latestResults.score > 50 ? 'text-warning' : 'text-danger'}`} 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black">{latestResults.score}%</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Score</span>
                        </div>
                      </div>
                      <h2 className="text-xl font-bold truncate px-2">{new URL(latestResults.site).hostname}</h2>
                      <p className="text-sm text-gray-400">Scan completed successfully.</p>
                      <div className="pt-2 flex justify-center gap-2">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {latestResults.results.length} Checks
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 pl-2">
                      <CheckCircle2 className="w-4 h-4" /> Comprehensive Checklist
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {latestResults.results.map((res, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-accent/30 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 group-hover:bg-accent/10 group-hover:text-accent transition-colors`}>
                               {getCheckIcon(res.check)}
                             </div>
                             <div>
                               <div className="font-bold text-sm tracking-tight">{res.check}</div>
                               <div className="text-xs text-gray-500 line-clamp-1">{res.details}</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
                               res.status.toUpperCase() === 'PASS' ? 'text-success bg-success/10' : 
                               res.status.toUpperCase() === 'WARNING' ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'
                             }`}>
                               {res.status}
                             </span>
                             {getStatusIcon(res.status)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Info Cards (Always visible if no results) */}
              {!latestResults && !isScanning && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-8 rounded-3xl glass card-hover space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                       <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">SEO Check</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Automatically detects `noindex` tags and robots.txt configurations that block search engines.</p>
                  </div>
                  <div className="p-8 rounded-3xl glass card-hover space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                       <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">Public Emails</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Scans for plaintext email addresses exposed to scrapers and ensures security protocols are met.</p>
                  </div>
                  <div className="p-8 rounded-3xl glass card-hover space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                       <ShieldCheck className="text-warning w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">SSL & Sitemap</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">Verifies HTTPS enforcement and ensures a valid sitemap.xml exists for discovery.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Audit Archive</h1>
                  <p className="text-gray-400">Track and review previous website performance reports.</p>
                </div>
                <div className="flex gap-3">
                   <button onClick={clearHistory} className="px-5 py-2 hover:bg-danger/10 hover:text-danger text-gray-500 border border-transparent rounded-xl flex items-center gap-2 text-xs font-bold transition-all">
                    <Trash2 className="w-4 h-4" />
                    Clear History
                  </button>
                  <button className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-xl flex items-center gap-2 text-sm font-bold">
                    <FileText className="w-4 h-4 text-accent" />
                    CSV Report
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="py-20 text-center space-y-4 rounded-3xl border border-dashed border-border">
                   <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-600">
                     <History className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-500">No reports yet</h3>
                   <p className="text-gray-600 max-w-xs mx-auto text-sm">Once you complete a scan, your detailed reports will appear here for review.</p>
                   <button onClick={() => setActiveTab('scan')} className="text-accent underline font-bold mt-2">Start a scan now</button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 uppercase text-[10px] tracking-widest font-black text-gray-500">
                      <tr>
                        <th className="px-8 py-5">Target Website</th>
                        <th className="px-8 py-5">Health Score</th>
                        <th className="px-8 py-5">Key Issues</th>
                        <th className="px-8 py-5">Last Scan</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {history.map((scan) => (
                        <tr key={scan.id} className="hover:bg-accent/5 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-bold flex items-center gap-2 text-sm">
                              {scan.site}
                              <a href={scan.site} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-accent transition-all">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-2 bg-white/5 rounded-full overflow-hidden`}>
                                <div className={`h-full ${scan.score > 80 ? 'bg-success' : scan.score > 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${scan.score}%` }} />
                              </div>
                              <span className={`text-sm font-black mono ${scan.score > 80 ? 'text-success' : scan.score > 50 ? 'text-warning' : 'text-danger'}`}>
                                {scan.score}%
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-2">
                              {scan.results.filter(r => r.status === 'FAIL').slice(0, 3).map((r, i) => (
                                  <div key={i} title={r.check} className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:scale-110 transition-transform cursor-help">
                                     {getCheckIcon(r.check)}
                                  </div>
                              ))}
                              {scan.results.filter(r => r.status === 'FAIL').length === 0 && (
                                <span className="text-success text-xs font-bold bg-success/10 px-2 py-1 rounded-lg">All Clean</span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-gray-500 text-xs font-mono">{formatDate(scan.timestamp)}</td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => {
                                setLatestResults(scan);
                                setActiveTab('scan');
                                window.scrollTo(0, 500);
                              }}
                              className="px-4 py-2 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-xl text-xs font-bold transition-all"
                            >
                              Expand
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pt-12 text-center text-gray-500 text-xs italic">
         Warning: Scans are performed in real-time. Concurrent scans may take up to 30 seconds depending on site complexity.
      </footer>
    </div>
  );
}

export default App;
