import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User
} from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData, useCollectionData, useCollection } from 'react-firebase-hooks/firestore';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Download, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  ChevronDown, 
  LayoutDashboard,
  Filter,
  BarChart3,
  AlertCircle,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  Search
} from 'lucide-react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { Config, Document, Review } from './types';
import { cn } from './lib/utils';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  public state: { hasError: boolean; error: any };
  public props: { children: React.ReactNode };
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse((this.state.error as any).message);
        errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
      } catch (e) {
        errorMessage = (this.state.error as any).message || "An unexpected error occurred.";
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-600 mb-6 text-sm break-words">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ADMIN_EMAIL = "kwang0923@gmail.com";

const getBadgeStyle = (text: string, type: string = 'default') => {
  const t = type.toLowerCase();
  let start = 0;
  let range = 60;
  
  if (t.includes('region')) {
    start = 190; // Cold: Cyan to Purple range (190-290)
    range = 100;
  } else if (t.includes('model')) {
    start = 320; // Warm: Pink to Orange range (320-60)
    range = 100;
  } else {
    start = 80; // Neutral: Green/Slate range (80-160)
    range = 80;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = (start + (Math.abs(hash) % range)) % 360;
  
  return {
    backgroundColor: `hsl(${hue}, 80%, 96%)`,
    color: `hsl(${hue}, 100%, 25%)`,
    borderColor: `hsl(${hue}, 80%, 90%)`,
  };
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, loading, error] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'user' | 'admin' | 'results'>('user');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (user) {
      console.log("Current User Email:", user.email);
      setIsAdmin(user.email === ADMIN_EMAIL);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Test connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'configs', 'main'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
      setAuthError("Google login failed. Please try again.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth failed", err);
      setAuthError(err.message || "Authentication failed. Please check your credentials.");
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Project Document Review</h1>
          <p className="text-gray-500 mb-8 text-center">
            {authMode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400 font-medium tracking-wider">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700 mb-6"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Google Account
          </button>

          <p className="text-center text-sm text-gray-500">
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-gray-900 font-bold hover:underline"
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <FileText className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">Project Document Review</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavButton 
              active={activeTab === 'user'} 
              onClick={() => setActiveTab('user')}
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Review"
            />
            <NavButton 
              active={activeTab === 'results'} 
              onClick={() => setActiveTab('results')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Results"
            />
            {isAdmin && (
              <NavButton 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')}
                icon={<Settings className="w-4 h-4" />}
                label="Admin"
              />
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-medium text-gray-900">{user.displayName}</div>
              <div className="text-[10px] text-gray-500">{user.email}</div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
        <NavButton 
          active={activeTab === 'user'} 
          onClick={() => setActiveTab('user')}
          icon={<LayoutDashboard className="w-4 h-4" />}
          label="Review"
        />
        <NavButton 
          active={activeTab === 'results'} 
          onClick={() => setActiveTab('results')}
          icon={<BarChart3 className="w-4 h-4" />}
          label="Results"
        />
        {isAdmin && (
          <NavButton 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')}
            icon={<Settings className="w-4 h-4" />}
            label="Admin"
          />
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'user' && <UserPanel user={user} />}
        {activeTab === 'results' && <ResultsView isAdmin={isAdmin} />}
        {activeTab === 'admin' && isAdmin && <AdminPanel user={user} />}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Components ---
function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="bg-gray-50 p-4 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Admin Panel ---
function AdminPanel({ user }: { user: User }) {
  const [config, configLoading] = useDocumentData<Config>(doc(db, 'configs', 'main') as any);
  const [newRegion, setNewRegion] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newFunction, setNewFunction] = useState('');

  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docRegion, setDocRegion] = useState('');
  const [docModel, setDocModel] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'regions' | 'models' | 'functions', value: string } | null>(null);

  const updateConfig = async (newConfig: Config) => {
    try {
      await setDoc(doc(db, 'configs', 'main'), newConfig);
    } catch (err) {
      console.error("Update config failed", err);
      handleFirestoreError(err, OperationType.WRITE, 'configs/main');
    }
  };

  const addConfigItem = (type: 'regions' | 'models' | 'functions', value: string) => {
    if (!value.trim()) return;
    const baseConfig = config || { regions: [], models: [], functions: [] };
    const updated = { ...baseConfig };
    if (!updated[type].includes(value)) {
      updated[type] = [...updated[type], value];
      updateConfig(updated);
    }
    if (type === 'regions') setNewRegion('');
    if (type === 'models') setNewModel('');
    if (type === 'functions') setNewFunction('');
  };

  const removeConfigItem = (type: 'regions' | 'models' | 'functions', value: string) => {
    const baseConfig = config || { regions: [], models: [], functions: [] };
    const updated = { ...baseConfig };
    updated[type] = updated[type].filter(i => i !== value);
    updateConfig(updated);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docUrl || !docRegion || !docModel) return;

    try {
      await addDoc(collection(db, 'documents'), {
        title: docTitle,
        fileUrl: docUrl,
        region: docRegion,
        model: docModel,
        createdAt: serverTimestamp(),
        authorUid: user.uid
      });
      setDocTitle('');
      setDocUrl('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'documents');
    }
  };

  if (configLoading) return <div className="text-center py-12 text-gray-400">Loading configuration...</div>;

  const currentConfig = config || { regions: [], models: [], functions: [] };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <ConfirmModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeConfigItem(deleteTarget.type, deleteTarget.value)}
        title="確認刪除變數"
        message={`您確定要刪除 ${deleteTarget?.type} 中的 "${deleteTarget?.value}" 嗎？此操作無法撤銷。`}
      />
      {/* Config Management */}
      <div className="lg:col-span-1 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          System Variables
        </h2>
        
        <ConfigSection 
          title="Regions" 
          items={currentConfig.regions} 
          value={newRegion} 
          onChange={setNewRegion} 
          onAdd={() => addConfigItem('regions', newRegion)} 
          onRemove={(i) => setDeleteTarget({ type: 'regions', value: i })} 
        />
        
        <ConfigSection 
          title="Models" 
          items={currentConfig.models} 
          value={newModel} 
          onChange={setNewModel} 
          onAdd={() => addConfigItem('models', newModel)} 
          onRemove={(i) => setDeleteTarget({ type: 'models', value: i })} 
        />
        
        <ConfigSection 
          title="Functions" 
          items={currentConfig.functions} 
          value={newFunction} 
          onChange={setNewFunction} 
          onAdd={() => addConfigItem('functions', newFunction)} 
          onRemove={(i) => setDeleteTarget({ type: 'functions', value: i })} 
        />
      </div>

      {/* Document Upload */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Document
        </h2>
        
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Title</label>
              <input 
                type="text" 
                value={docTitle} 
                onChange={e => setDocTitle(e.target.value)}
                placeholder="e.g. Q1 Audit Report"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">File URL (Direct Download)</label>
              <input 
                type="url" 
                value={docUrl} 
                onChange={e => setDocUrl(e.target.value)}
                placeholder="https://example.com/file.pdf"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField 
              label="Region" 
              value={docRegion} 
              onChange={setDocRegion} 
              options={currentConfig.regions} 
            />
            <SelectField 
              label="Model" 
              value={docModel} 
              onChange={setDocModel} 
              options={currentConfig.models} 
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Publish Document
          </button>
        </form>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Documents</h3>
          <DocumentList isAdmin={true} />
        </div>
      </div>
    </div>
  );
}

function ConfigSection({ title, items, value, onChange, onAdd, onRemove }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={value} 
          onChange={e => onChange(e.target.value)}
          placeholder={`Add ${title.toLowerCase()}...`}
          className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
        />
        <button 
          onClick={onAdd}
          className="p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item: string) => (
          <span 
            key={item} 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border transition-all"
            style={getBadgeStyle(item, title)}
          >
            {item}
            <button onClick={() => onRemove(item)} className="hover:text-red-500 opacity-50 hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select 
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all text-sm pr-10"
          required
        >
          <option value="">Select {label}</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

// --- User Panel ---
function UserPanel({ user }: { user: User }) {
  const [config] = useDocumentData<Config>(doc(db, 'configs', 'main') as any);
  const [selectedFunction, setSelectedFunction] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Document Review</h1>
          <p className="text-gray-500">Select your function and search models to review documents.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search models..."
              value={modelSearch}
              onChange={e => setModelSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all text-sm font-medium"
            />
          </div>

          <div className="relative w-full sm:w-64">
            <select 
              value={selectedFunction} 
              onChange={e => setSelectedFunction(e.target.value)}
              className={cn(
                "w-full appearance-none px-4 py-3 bg-white border rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all text-sm pr-10 font-bold",
                selectedFunction ? "border-gray-200 focus:ring-gray-900/10" : "border-red-500 ring-2 ring-red-50 focus:ring-red-200 animate-pulse"
              )}
            >
              <option value="" disabled>Select your function</option>
              {config?.functions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <Filter className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", selectedFunction ? "text-gray-400" : "text-red-500")} />
          </div>
        </div>
      </div>

      <DocumentList filterFunction={selectedFunction} modelSearch={modelSearch} user={user} />
    </div>
  );
}

function DocumentList({ filterFunction, modelSearch = '', user, isAdmin = false }: { filterFunction?: string; modelSearch?: string; user?: User; isAdmin?: boolean }) {
  const docsQuery = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
  
  const [docsSnapshot, loading] = useCollection(docsQuery as any);
  const [reviewsSnapshot] = useCollection(collection(db, 'reviews') as any);

  let documents = docsSnapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Document));
  const reviews = reviewsSnapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Review));

  if (loading) return <div className="text-center py-12 text-gray-400">Loading documents...</div>;

  if (modelSearch.trim()) {
    const searchLower = modelSearch.toLowerCase();
    documents = documents?.filter(d => d.model.toLowerCase().includes(searchLower));
  }

  if (!documents?.length) return (
    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
      <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
      <p className="text-gray-400">No documents found.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {documents.map(doc => (
        <DocumentCard 
          key={doc.id} 
          doc={doc} 
          user={user} 
          isAdmin={isAdmin} 
          selectedFunction={filterFunction}
          reviews={reviews?.filter(r => r.documentId === doc.id) || []}
        />
      ))}
    </div>
  );
}

function DocumentCard({ doc: d, user, isAdmin, reviews, selectedFunction }: { doc: Document; user?: User; isAdmin: boolean; reviews: Review[]; selectedFunction?: string; key?: string }) {
  const userReview = user ? reviews.find(r => r.userId === user.uid) : null;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comment, setComment] = useState(userReview?.comment || '');
  const [error, setError] = useState('');

  const handleReview = async (status: 'agree' | 'disagree') => {
    if (!user || !selectedFunction) return;
    setError('');
    
    if (status === 'disagree' && !comment.trim()) {
      setError('Selecting “Disagree” requires a comment.');
      return;
    }

    try {
      if (userReview) {
        await updateDoc(doc(db, 'reviews', userReview.id), {
          status,
          comment,
          function: selectedFunction,
          timestamp: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'reviews'), {
          documentId: d.id,
          userId: user.uid,
          userEmail: user.email,
          status,
          comment,
          function: selectedFunction,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reviews');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'documents', d.id));
    } catch (err) {
      console.error("Delete document failed", err);
      handleFirestoreError(err, OperationType.DELETE, `documents/${d.id}`);
    }
  };

  const agreeCount = reviews.filter(r => r.status === 'agree').length;
  const disagreeCount = reviews.filter(r => r.status === 'disagree').length;

  return (
    <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-lg hover:shadow-2xl hover:border-gray-300 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <ConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="確認刪除文件"
        message={`您確定要刪除文件 "${d.title}" 嗎？此操作無法撤銷。`}
      />
      <div className="flex justify-between items-start mb-4">
        <div 
          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border"
          style={getBadgeStyle(d.region, 'region')}
        >
          {d.region}
        </div>
        {isAdmin && (
          <button onClick={() => setShowDeleteConfirm(true)} className="text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{d.title}</h3>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <span 
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border"
          style={getBadgeStyle(d.region, 'region')}
        >{d.region}</span>
        <span 
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border"
          style={getBadgeStyle(d.model, 'model')}
        >{d.model}</span>
      </div>

      <div className="mt-auto space-y-4">
        <a 
          href={d.fileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <Download className="w-4 h-4" />
          Download File
        </a>

        {!isAdmin && user && (
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleReview('agree')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                userReview?.status === 'agree' 
                  ? "bg-green-200 border-green-600 text-green-950 ring-2 ring-green-200 shadow-inner" 
                  : "bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-300"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Agree
            </button>
            <button 
              onClick={() => handleReview('disagree')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                userReview?.status === 'disagree' 
                  ? "bg-red-200 border-red-600 text-red-950 ring-2 ring-red-200 shadow-inner" 
                  : "bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-300"
              )}
            >
              <XCircle className="w-4 h-4" />
              Disagree
            </button>
          </div>
        )}

        {!isAdmin && user && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comment {userReview?.status === 'disagree' && <span className="text-red-500">*</span>}</label>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (e.target.value.trim()) setError('');
              }}
              placeholder="Enter your comment here..."
              className={cn(
                "w-full p-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all min-h-[80px] resize-none",
                error ? "border-red-300 ring-2 ring-red-50" : "border-gray-200"
              )}
            />
            {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <span>Results</span>
          <div className="flex gap-3">
            <span className="text-green-700">{agreeCount} Agree</span>
            <span className="text-red-700">{disagreeCount} Disagree</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Results View ---
function ResultsView({ isAdmin = false }: { isAdmin?: boolean }) {
  const [config] = useDocumentData<Config>(doc(db, 'configs', 'main') as any);
  const [reviewsSnapshot, loading] = useCollection(collection(db, 'reviews') as any);
  const [docsSnapshot] = useCollection(collection(db, 'documents') as any);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const reviews = reviewsSnapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Review));
  const documents = docsSnapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Document));

  const filteredReviews = reviews?.filter(r => {
    const docObj = documents?.find(d => d.id === r.documentId);
    const searchLower = searchTerm.toLowerCase();
    return (
      r.userEmail.toLowerCase().includes(searchLower) ||
      (docObj?.title || '').toLowerCase().includes(searchLower) ||
      (docObj?.model || '').toLowerCase().includes(searchLower) ||
      r.function.toLowerCase().includes(searchLower) ||
      r.status.toLowerCase().includes(searchLower) ||
      (r.comment || '').toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

  const exportToExcel = () => {
    if (!filteredReviews) return;
    const data = filteredReviews.map(r => {
      const docObj = documents?.find(d => d.id === r.documentId);
      return {
        User: r.userEmail,
        Models: docObj?.model || 'N/A',
        Document: docObj?.title || 'Deleted Document',
        Function: r.function,
        Status: r.status,
        Comment: r.comment || '',
        Date: r.timestamp?.toDate().toLocaleDateString()
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reviews");
    XLSX.writeFile(workbook, "Project_Document_Reviews.xlsx");
  };

  const handleBulkDelete = async () => {
    try {
      for (const reviewId of selectedReviews) {
        await deleteDoc(doc(db, 'reviews', reviewId));
      }
      setSelectedReviews([]);
    } catch (err) {
      console.error("Bulk delete failed", err);
      handleFirestoreError(err, OperationType.DELETE, 'reviews');
    }
  };

  const toggleSelectAll = () => {
    if (selectedReviews.length === filteredReviews?.length && filteredReviews?.length > 0) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviews?.map(r => r.id) || []);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedReviews(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading results...</div>;

  const functions = config?.functions || [];
  
  return (
    <div className="space-y-8">
      <ConfirmModal 
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="確認批量刪除"
        message={`您確定要刪除選取的 ${selectedReviews.length} 筆評論嗎？此操作無法撤銷。`}
      />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Review Summary</h1>
        {isAdmin && <p className="text-gray-500">Real-time feedback across all functions.</p>}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {functions.map(f => {
            const fReviews = reviews?.filter(r => r.function === f) || [];
            const agrees = fReviews.filter(r => r.status === 'agree').length;
            const disagrees = fReviews.filter(r => r.status === 'disagree').length;
            const total = fReviews.length;
            const percentage = total > 0 ? Math.round((agrees / total) * 100) : 0;

            return (
              <div key={f} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{f}</div>
                <div className="text-3xl font-light text-gray-900 mb-4">{percentage}% <span className="text-sm font-medium text-gray-400">Agree</span></div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-4">
                  <div 
                    className="bg-gray-900 h-full transition-all duration-1000" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-green-700">{agrees} Agree</span>
                  <span className="text-red-700">{disagrees} Disagree</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold whitespace-nowrap">Detailed Review List</h3>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search keywords..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && selectedReviews.length > 0 && (
              <button 
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedReviews.length})
              </button>
            )}
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to EXCEL
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedReviews.length === filteredReviews?.length && filteredReviews?.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                  </th>
                )}
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Models</th>
                <th className="px-6 py-4">Document</th>
                <th className="px-6 py-4">Function</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Comment</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReviews?.map(r => {
                const docObj = documents?.find(d => d.id === r.documentId);
                const isSelected = selectedReviews.includes(r.id);
                return (
                  <tr key={r.id} className={cn("hover:bg-gray-100/50 transition-colors border-b border-gray-50 last:border-0", isSelected ? "bg-blue-50/50" : "even:bg-gray-50/30")}>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelect(r.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 font-medium text-gray-900">{r.userEmail}</td>
                    <td className="px-6 py-4">
                      {docObj ? (
                        <span 
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border"
                          style={getBadgeStyle(docObj.model, 'model')}
                        >
                          {docObj.model}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{docObj?.title || 'Deleted Document'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase">
                        {r.function}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.status === 'agree' ? (
                        <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                          <CheckCircle className="w-3 h-3" /> Agree
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                          <XCircle className="w-3 h-3" /> Disagree
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={r.comment}>
                      {r.comment || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {r.timestamp?.toDate().toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
