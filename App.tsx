
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AIChat from './components/AIChat';
import DataManagementPanel from './components/DataManagementPanel';
import SettingsModal from './components/SettingsModal';
import LoginPage from './components/LoginPage';
import { AnalysisModule, SchoolBranch, SchoolPerformance, UserRole } from './types';
import { AVAILABLE_YEARS } from './constants';
import { Calendar, ArrowRight, Database, CloudOff } from 'lucide-react';
import { parseSchoolData, parseStructuredFinanceData, parseStructuredAdmissionData } from './utils/parser';
import { supabase } from './lib/supabaseClient';

const AUTH_KEY = 'darshan_auth_session';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    const savedRole = localStorage.getItem(AUTH_KEY);
    return savedRole ? (savedRole as UserRole) : null;
  });

  const [currentModule, setCurrentModule] = useState<AnalysisModule>(AnalysisModule.Home);
  const [selectedSchool, setSelectedSchool] = useState<SchoolBranch | 'ALL'>('ALL');
  const [selectedWing, setSelectedWing] = useState<string>('ALL'); // ALL means Holistic for the selected school
  const [fromYear, setFromYear] = useState<string>(AVAILABLE_YEARS[0]);
  const [toYear, setToYear] = useState<string>(AVAILABLE_YEARS[4]);

  const [data, setData] = useState<SchoolPerformance[]>([]);
  
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [canGuestDownload, setCanGuestDownload] = useState(true);

  // Reset wing when school changes
  useEffect(() => {
    setSelectedWing('ALL');
  }, [selectedSchool]);

  useEffect(() => {
    const checkPermissions = () => {
        const savedConfig = localStorage.getItem('darshan_auth_config');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            setCanGuestDownload(parsed.guestDownload !== false);
        }
    };
    checkPermissions();
    window.addEventListener('auth-config-changed', checkPermissions);
    return () => window.removeEventListener('auth-config-changed', checkPermissions);
  }, []);

  const canDownload = useMemo(() => {
    if (userRole === 'admin' || userRole === 'finance') return true;
    return canGuestDownload;
  }, [userRole, canGuestDownload]);

  // FETCH DATA FROM SUPABASE ON MOUNT
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data: dbData, error } = await supabase
        .from('school_performance')
        .select('*');

      if (error) throw error;

      if (dbData) {
        // Map snake_case DB columns back to camelCase application model
        const mappedData: SchoolPerformance[] = dbData.map(row => ({
          id: row.id,
          timestamp: row.timestamp,
          year: row.year,
          name: row.name as SchoolBranch,
          wing: row.wing,
          type: row.type as 'Finance' | 'Admission',
          fileName: row.file_name,
          financials: row.financials,
          academics: row.academics,
          healthScore: row.health_score,
          riskLevel: row.risk_level,
          trend: row.trend,
          concessions: row.concessions,
          monthlyCashFlow: row.monthly_cash_flow
        }));
        setData(mappedData);
      }
    } catch (e: any) {
      console.error("Supabase Fetch Error:", e);
      setDbError("Could not connect to Institutional Database.");
    } finally {
      setLoading(false);
    }
  };

  const saveToSupabase = async (items: SchoolPerformance[]) => {
    setLoading(true);
    try {
      // Map application model to snake_case DB columns
      const dbRows = items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        year: item.year,
        name: item.name,
        wing: item.wing,
        type: item.type,
        file_name: item.fileName,
        financials: item.financials,
        academics: item.academics,
        health_score: item.healthScore,
        risk_level: item.riskLevel,
        trend: item.trend,
        concessions: item.concessions,
        monthly_cash_flow: item.monthlyCashFlow
      }));

      const { error } = await supabase
        .from('school_performance')
        .upsert(dbRows, { onConflict: 'id' });

      if (error) throw error;

      // Refresh local data
      await fetchData();
    } catch (error) {
      console.error("Supabase Save Error:", error);
      alert("Failed to save data to the cloud database.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    localStorage.setItem(AUTH_KEY, role);
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem(AUTH_KEY);
    setIsDataPanelOpen(false);
    setIsSettingsOpen(false);
  };

  const handleDataUpload = async (school: SchoolBranch, wing: string, year: string, file: File, type: 'Finance' | 'Admission') => {
    setLoading(true);
    try {
      const newItems = await parseSchoolData(school, wing, year, file, type);
      await saveToSupabase(newItems);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to parse the uploaded file.");
      setLoading(false);
    }
  };

  const handleStructuredImport = async (school: SchoolBranch, wing: string, year: string, tables: { revenue: string[][], expense: string[][], assets: string[][], liabilities: string[][] }) => {
    setLoading(true);
    try {
        const newItems = await parseStructuredFinanceData(school, wing, year, tables);
        await saveToSupabase(newItems);
    } catch (error) {
        console.error("Structured import failed", error);
        alert("Failed to process the tables.");
        setLoading(false);
    }
  };

  const handleAdmissionImport = async (school: SchoolBranch, wing: string, year: string, gridData: string[][]) => {
      setLoading(true);
      try {
          const newItems = await parseStructuredAdmissionData(school, wing, year, gridData);
          await saveToSupabase(newItems);
      } catch (error) {
          console.error("Admission import failed", error);
          alert("Failed to process admission data.");
          setLoading(false);
      }
  };

  const handleDeleteData = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this record from the database?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('school_performance')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update or refetch
      setData(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete record.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (performance: SchoolPerformance) => {
      await saveToSupabase([performance]);
      alert(`Ledger Updated: ${performance.name} (${performance.wing}) for FY ${performance.year}. Data merged successfully.`);
  };

  const filteredData = useMemo(() => {
    // Sort by timestamp descending
    const sortedData = [...data].sort((a, b) => b.timestamp - a.timestamp);
    
    // Create a unique map to filter out any lingering duplicates
    const uniqueMap = new Map();
    sortedData.forEach(item => {
        const key = `${item.name}-${item.wing}-${item.year}-${item.type}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
        }
    });

    const dedupedData = Array.from(uniqueMap.values());

    return dedupedData.filter(item => {
        // 1. Filter by Year Range
        const yearMatch = item.year >= fromYear && item.year <= toYear;
        if (!yearMatch) return false;

        // 2. Filter by School
        if (selectedSchool === 'ALL') {
            return true; // Holistic Group View includes ALL schools and ALL wings
        } else if (item.name === selectedSchool) {
            // 3. Filter by Wing (If specific school selected)
            if (selectedWing === 'ALL') {
                return true; // Holistic School View includes ALL wings for this school
            } else {
                return item.wing === selectedWing; // Specific Wing View
            }
        }
        return false;
    });
  }, [data, selectedSchool, selectedWing, fromYear, toYear]);

  useEffect(() => {
      if (fromYear > toYear) {
          setToYear(fromYear);
      }
  }, [fromYear, toYear]);

  if (!userRole) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isPrivileged = userRole === 'admin' || userRole === 'finance';
  
  // Clean text for display
  const displaySchoolName = selectedSchool === 'ALL' 
    ? 'Darshan Group Portfolio' 
    : selectedSchool.replace(/\[|\]/g, "");

  const displayWingName = selectedSchool === 'ALL'
    ? 'Consolidated View'
    : selectedWing === 'ALL'
        ? 'Holistic (All Wings)'
        : selectedWing;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar 
        currentModule={currentModule} 
        onModuleChange={setCurrentModule}
        selectedSchool={selectedSchool}
        selectedWing={selectedWing}
        onSchoolChange={setSelectedSchool}
        onWingChange={setSelectedWing}
        onOpenDataPanel={() => setIsDataPanelOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        userRole={userRole}
        onLogout={handleLogout}
      />

      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading && data.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-xl"></div>
               <p className="font-black text-slate-900 tracking-widest uppercase text-xs">Synchronizing Repository...</p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                             <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                                {currentModule}
                             </h1>
                        </div>
                        <p className="text-slate-500 font-medium">
                            <span className="font-black text-slate-800 uppercase tracking-wide">{displaySchoolName}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            <span className="text-rose-500 font-bold uppercase">{displayWingName}</span>
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-2xl">
                        <div className="flex items-center gap-2 px-3 border-r-2 border-slate-100 pr-4">
                            <Calendar size={18} className="text-blue-600" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Period</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <select value={fromYear} onChange={(e) => setFromYear(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-lg text-slate-900 font-black text-xs px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
                                {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <ArrowRight size={16} className="text-slate-300" />
                            <select value={toYear} onChange={(e) => setToYear(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-lg text-slate-900 font-black text-xs px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer">
                                {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                
                {dbError ? (
                   <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border-2 border-slate-100 animate-in zoom-in duration-300">
                      <CloudOff size={48} className="text-rose-400 mb-4" />
                      <p className="text-slate-900 font-bold">{dbError}</p>
                      <p className="text-xs text-slate-500 mt-2">Please verify Supabase connection settings.</p>
                   </div>
                ) : data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-3xl border-4 border-slate-100 border-dashed animate-in zoom-in duration-500 shadow-inner">
                      <div className="p-6 bg-slate-50 rounded-full mb-6 border-2 border-slate-100">
                        <Database size={48} className="text-slate-300" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Repository Empty</h3>
                      <p className="text-slate-400 mt-2 max-w-md text-center font-medium">
                        {isPrivileged 
                            ? 'The Institutional Intelligence Unit requires data. Please use the Ingestion Terminal to populate the repository.'
                            : 'No audited reports have been published to the digital repository yet.'}
                      </p>
                      {isPrivileged && (
                         <button onClick={() => setIsDataPanelOpen(true)} className="mt-8 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-2xl active:scale-95 uppercase tracking-widest">Open Ingestion Terminal</button>
                      )}
                  </div>
                ) : filteredData.length === 0 && selectedSchool !== 'ALL' ? (
                   <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border-2 border-slate-100 animate-in zoom-in duration-300">
                      <p className="text-slate-400 font-black tracking-widest uppercase text-xs">No records for {displaySchoolName} ({displayWingName}) in selected audit range.</p>
                   </div>
                ) : (
                  <Dashboard module={currentModule} scope={selectedSchool} data={filteredData} canDownload={canDownload} />
                )}
            </div>
          )}
        </main>
      </div>

      {isPrivileged && (
          <DataManagementPanel 
            isOpen={isDataPanelOpen}
            onClose={() => setIsDataPanelOpen(false)}
            datasets={data}
            onUpload={handleDataUpload}
            onImportStructured={handleStructuredImport}
            onImportAdmission={handleAdmissionImport}
            onDelete={handleDeleteData}
            onBulkUpdate={handleBulkUpdate}
            contextSchool={selectedSchool}
            contextWing={selectedWing}
            contextYear={toYear}
          />
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} userRole={userRole} />
      <AIChat data={filteredData} scope={`${displaySchoolName} - ${displayWingName} (${fromYear}-${toYear})`} />
    </div>
  );
};

export default App;
