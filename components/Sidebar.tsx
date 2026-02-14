
import React, { useMemo } from 'react';
import { AnalysisModule, SchoolBranch, UserRole } from '../types';
import { ANALYSIS_MODULES, DARSHAN_SCHOOLS, SCHOOL_WINGS } from '../constants';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Wallet, 
  PieChart, 
  ArrowLeftRight, 
  Building2, 
  UserPlus, 
  UserMinus, 
  Percent, 
  Calculator, 
  ClipboardList, 
  Globe, 
  BarChart2,
  School,
  Database,
  LogOut,
  Settings,
  FileText,
  Layers
} from 'lucide-react';

interface SidebarProps {
  currentModule: AnalysisModule;
  onModuleChange: (m: AnalysisModule) => void;
  selectedSchool: SchoolBranch | 'ALL';
  selectedWing: string;
  onSchoolChange: (s: SchoolBranch | 'ALL') => void;
  onWingChange: (w: string) => void;
  onOpenDataPanel: () => void;
  onOpenSettings: () => void;
  userRole: UserRole;
  onLogout: () => void;
}

const getIcon = (module: AnalysisModule) => {
  switch (module) {
    case AnalysisModule.Home: return <LayoutDashboard size={18} />;
    case AnalysisModule.DetailedReport: return <FileText size={18} />;
    case AnalysisModule.Revenue: return <TrendingUp size={18} />;
    case AnalysisModule.Students: return <Users size={18} />;
    case AnalysisModule.Costs: return <Wallet size={18} />;
    case AnalysisModule.Profitability: return <PieChart size={18} />;
    case AnalysisModule.CashFlow: return <ArrowLeftRight size={18} />;
    case AnalysisModule.CapEx: return <Building2 size={18} />;
    case AnalysisModule.Admissions: return <UserPlus size={18} />;
    case AnalysisModule.Withdrawals: return <UserMinus size={18} />;
    case AnalysisModule.Concessions: return <Percent size={18} />;
    case AnalysisModule.UnitEconomics: return <Calculator size={18} />;
    case AnalysisModule.Scorecards: return <ClipboardList size={18} />;
    case AnalysisModule.GroupAnalysis: return <Globe size={18} />;
    case AnalysisModule.Benchmarking: return <BarChart2 size={18} />;
    default: return <LayoutDashboard size={18} />;
  }
};

const Sidebar: React.FC<SidebarProps> = ({ 
  currentModule, 
  onModuleChange, 
  selectedSchool, 
  selectedWing,
  onSchoolChange, 
  onWingChange,
  onOpenDataPanel,
  onOpenSettings,
  userRole,
  onLogout
}) => {
  
  const isPrivileged = userRole === 'admin' || userRole === 'finance';
  
  // Get wings for selected school
  const availableWings = selectedSchool !== 'ALL' && SCHOOL_WINGS[selectedSchool] 
    ? SCHOOL_WINGS[selectedSchool] 
    : [];

  const showWingSelector = selectedSchool !== 'ALL' && availableWings.length > 1;

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-700 z-10">
      {/* Brand */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
           <School className="text-rose-500" />
           Insight360
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Darshan Schools</p>
      </div>

      {/* Scope Selector (View) */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase flex items-center gap-2">
              <Globe size={12} /> School Scope
          </label>
          <select 
            value={selectedSchool}
            onChange={(e) => onSchoolChange(e.target.value as SchoolBranch | 'ALL')}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
          >
            <option value="ALL">All Schools (Group View)</option>
            {DARSHAN_SCHOOLS.map(school => (
              <option key={school} value={school}>{school}</option>
            ))}
          </select>
        </div>

        {/* Wing Selector - Only visible if specific school selected AND has multiple wings */}
        {showWingSelector && (
           <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-semibold text-rose-400 mb-2 block uppercase flex items-center gap-2">
                  <Layers size={12} /> Wing View
              </label>
              <select 
                value={selectedWing}
                onChange={(e) => onWingChange(e.target.value)}
                className="w-full bg-slate-900 border border-rose-900/50 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              >
                <option value="ALL">Holistic {selectedSchool.replace("Darshan Academy", "").replace("Darshan Vidhayalaya", "").replace(/\[|\]/g, "")}</option>
                {availableWings.map(wing => (
                  <option key={wing} value={wing}>{wing}</option>
                ))}
              </select>
           </div>
        )}
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <div className="px-4 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Analysis Modules</span>
        </div>
        <nav className="space-y-1 px-2">
          {ANALYSIS_MODULES.map((module) => (
            <button
              key={module}
              onClick={() => onModuleChange(module)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                currentModule === module 
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {getIcon(module)}
              <span className="truncate">{module}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Data Management Trigger - Only for Admin/Finance */}
      {isPrivileged && (
          <div className="p-4 border-t border-slate-700 bg-slate-800/30 space-y-2">
            <button 
                onClick={onOpenDataPanel}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg text-sm font-medium transition-colors border border-slate-600 shadow-lg"
            >
                <Database size={16} />
                Manage Data
            </button>
          </div>
      )}

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${userRole === 'admin' ? 'bg-sky-500' : userRole === 'finance' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    {userRole === 'admin' ? 'AD' : userRole === 'finance' ? 'FN' : 'GU'}
                </div>
                <div>
                    <p className="text-xs font-bold text-white capitalize">{userRole === 'finance' ? 'Finance Team' : userRole}</p>
                    <p className="text-[10px] text-slate-400">Connected</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {isPrivileged && (
                    <button 
                        onClick={onOpenSettings}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                )}
                <button 
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    title="Logout"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
