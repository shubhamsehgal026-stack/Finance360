
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, ClipboardList, Trash2, Database, Info, 
  BadgeCheck, FileText, School, RefreshCcw, TableProperties,
  PlusCircle, Save, AlertCircle, TrendingUp, Wallet, 
  ChevronRight, Layers, LayoutGrid, CheckCircle2, ChevronDown, ListFilter,
  Plus,
  Coins,
  Scale,
  Activity,
  BoxSelect,
  PackageSearch,
  Grid3X3,
  Sparkles,
  Pencil,
  ArrowRightLeft,
  Upload
} from 'lucide-react';
import { SchoolBranch, SchoolPerformance, ExpenseItem } from '../types';
import { AVAILABLE_YEARS, DARSHAN_SCHOOLS, SCHOOL_WINGS } from '../constants';
import { parseTextToItems, mapFinanceData } from '../utils/parser';

interface DataManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: SchoolPerformance[];
  onUpload: (school: SchoolBranch, wing: string, year: string, file: File, type: 'Finance' | 'Admission') => Promise<void>;
  onImportStructured: (school: SchoolBranch, wing: string, year: string, tables: { revenue: string[][], expense: string[][], assets: string[][], liabilities: string[][] }) => Promise<void>;
  onImportAdmission: (school: SchoolBranch, wing: string, year: string, gridData: string[][]) => Promise<void>;
  onDelete: (id: string) => void;
  onBulkUpdate?: (data: SchoolPerformance) => void;
  // Context Props
  contextSchool: SchoolBranch | 'ALL';
  contextWing: string; // 'ALL' or specific wing
  contextYear: string;
}

interface IngestItem {
    id: string;
    category: string;
    subCategory: string;
    label: string;
    value: number;
}

const FINANCE_CATEGORIES = ["Revenue", "Expenses", "Assets", "Liabilities"];
const ACADEMIC_CATEGORIES = ["Enrollment", "New Admissions", "Withdrawals"];

const DataManagementPanel: React.FC<DataManagementPanelProps> = ({
  isOpen, onClose, datasets, onDelete, onBulkUpdate, onUpload,
  contextSchool, contextWing, contextYear
}) => {
  const [activeTab, setActiveTab] = useState<'ingest' | 'history'>('ingest');
  
  // Context State - Initialized with default but updated via useEffect
  const [selectedSchool, setSelectedSchool] = useState<SchoolBranch>(DARSHAN_SCHOOLS[0] as SchoolBranch);
  const [selectedWing, setSelectedWing] = useState<string>(SCHOOL_WINGS[DARSHAN_SCHOOLS[0]]?.[0] || "Main Wing");
  const [selectedYear, setSelectedYear] = useState<string>(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]);
  const [selectedType, setSelectedType] = useState<'Finance' | 'Admission'>('Finance');
  
  // Hierarchy States
  const [currentCategory, setCurrentCategory] = useState<string>("Revenue");
  const [currentSubCategory, setCurrentSubCategory] = useState<string>("");
  
  const [rawText, setRawText] = useState('');
  const [stagingItems, setStagingItems] = useState<IngestItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = selectedType === 'Finance' ? FINANCE_CATEGORIES : ACADEMIC_CATEGORIES;

  // Determine available wings for current selection
  const availableWings = useMemo(() => SCHOOL_WINGS[selectedSchool] || ["Main Wing"], [selectedSchool]);
  const hasMultipleWings = availableWings.length > 1;

  // Calculate Grand Total of Worksheet
  const worksheetTotal = useMemo(() => {
    return stagingItems.reduce((acc, item) => acc + item.value, 0);
  }, [stagingItems]);

  // Sync state with Context Props whenever the panel opens or context changes
  useEffect(() => {
    if (isOpen) {
        // 1. Sync Year
        if (contextYear) setSelectedYear(contextYear);

        // 2. Sync School
        if (contextSchool !== 'ALL') {
            setSelectedSchool(contextSchool);
            
            // 3. Sync Wing (Only if school is specific)
            const schoolWings = SCHOOL_WINGS[contextSchool] || ["Main Wing"];
            if (contextWing !== 'ALL' && schoolWings.includes(contextWing)) {
                setSelectedWing(contextWing);
            } else {
                // If Wing is 'ALL' (Holistic View), default to the first wing for data entry
                // (You generally upload data for a specific wing, not "Holistic")
                setSelectedWing(schoolWings[0]);
            }
        }
    }
  }, [isOpen, contextSchool, contextWing, contextYear]);

  // Update available wings when school changes manually (if allowed)
  useEffect(() => {
      const wings = SCHOOL_WINGS[selectedSchool];
      if (wings && wings.length > 0) {
          // If the currently selected wing is not valid for the new school, reset it
          if (!wings.includes(selectedWing)) {
              setSelectedWing(wings[0]);
          }
      } else {
          setSelectedWing("Main Wing");
      }
  }, [selectedSchool]);

  // --- AUTO-LOAD LOGIC TO FIX OVERWRITE ISSUE ---
  // When School/Wing/Year changes, we try to load the latest existing data into the staging area
  // so the user is APPENDING/EDITING rather than starting from scratch.
  useEffect(() => {
    if (activeTab === 'ingest') {
        loadExistingData();
    }
  }, [selectedSchool, selectedWing, selectedYear, selectedType]);

  const loadExistingData = () => {
    // Find the LATEST record for this specific combo (School + Wing + Year + Type)
    const existing = datasets
        .filter(d => d.name === selectedSchool && d.wing === selectedWing && d.year === selectedYear && d.type === selectedType)
        .sort((a,b) => b.timestamp - a.timestamp)[0];

    if (existing && existing.type === 'Finance') {
        const items: IngestItem[] = [];
        
        // 1. Map detailed items
        existing.financials.detailedExpenses.forEach(exp => {
            items.push({
                id: Math.random().toString(36).substr(2, 9),
                category: exp.category || 'Expenses',
                subCategory: exp.subCategory || 'General',
                label: exp.head,
                value: exp.amount
            });
        });

        // 2. If detailed items are missing but totals exist (Legacy Data support), inject as lumpsum
        const hasRevenue = items.some(i => i.category === 'Revenue');
        if (!hasRevenue && existing.financials.revenue > 0) {
            items.push({ id: 'legacy-rev', category: 'Revenue', subCategory: 'Legacy Balance', label: 'Total Revenue (Brought Forward)', value: existing.financials.revenue });
        }
        
        // 3. Ensure Assets/Liabilities are carried over if not in detailed list
        const hasAssets = items.some(i => i.category === 'Assets');
        if (!hasAssets && existing.financials.assetValue > 0) {
             items.push({ id: 'legacy-asset', category: 'Assets', subCategory: 'Balance Sheet', label: 'Total Assets (Brought Forward)', value: existing.financials.assetValue });
        }

        setStagingItems(items);
    } 
    else if (existing && existing.type === 'Admission') {
         const items: IngestItem[] = [];
         existing.academics.classMetrics.forEach(cls => {
             items.push({
                 id: Math.random().toString(36).substr(2, 9),
                 category: 'Enrollment',
                 subCategory: cls.grade,
                 label: `Grade ${cls.grade}`,
                 value: cls.enrollment
             });
         });
         setStagingItems(items);
    }
    else {
        setStagingItems([]); // Clean slate if no data exists
    }
  };

  const handleManualLoad = (record: SchoolPerformance) => {
      setSelectedSchool(record.name);
      setSelectedWing(record.wing || "Main Wing");
      setSelectedYear(record.year);
      setSelectedType(record.type);
      setActiveTab('ingest');
      // The useEffect will trigger the actual data mapping
  };

  const handleTypeChange = (type: 'Finance' | 'Admission') => {
      setSelectedType(type);
      const cats = type === 'Finance' ? FINANCE_CATEGORIES : ACADEMIC_CATEGORIES;
      setCurrentCategory(cats[0]);
      setCurrentSubCategory("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              await onUpload(selectedSchool, selectedWing, selectedYear, file, selectedType);
              alert("File processed successfully.");
              loadExistingData(); // Reload to show data
          } catch (error) {
              console.error(error);
              alert("Error uploading file.");
          }
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAutoParse = () => {
    if (!rawText.trim()) return;
    
    // Parse the raw text first
    const parsed = parseTextToItems(rawText);
    
    const newItems = parsed.map(p => {
        let detectedSub = "";
        const l = p.label.toLowerCase();
        
        // Auto-detection logic for Revenue based on institutional rules
        if (currentCategory === 'Revenue') {
             if (l.match(/fee|fine|annual charge|tuition|admission|academic|exam|registration/)) {
                 detectedSub = "Academic & Student Fee Revenue";
             }
             else if (l.match(/interest|dividend|investment/)) {
                 detectedSub = "Financial & Investment Income";
             }
             else {
                 detectedSub = "Other Operating Revenue";
             }
        }
        else if (currentCategory === 'Expenses') {
             // 1. Staff & Employee Costs
             if (l.match(/salary|wage|provident|esi|medical|staff welfare|honorarium|bonus|gratuity|stipend/)) { 
                 detectedSub = "Staff & Employee Costs"; 
             }
             // 2. Professional & Compliance Expenses
             else if (l.match(/audit|professional|affiliation|legal|consultancy|inspection/)) { 
                 detectedSub = "Professional & Compliance Expenses"; 
             }
             // 3. School Maintenance & Infrastructure
             else if (l.match(/school maintenance|building|furniture|civil|paint|whitewash|infrastructure|repair/)) { 
                 detectedSub = "School Maintenance & Infrastructure"; 
             }
             // 4. Utilities & Essential Services
             else if (l.match(/electricity|water|telephone|internet|broadband|wifi|power|fuel|generator|diesel|gas/)) { 
                 detectedSub = "Utilities & Essential Services"; 
             }
             // 5. Academic & Educational Activities
             else if (l.match(/workshop|seminar|science|smart class|newspaper|book|periodical|journal|library|educational/)) { 
                 detectedSub = "Academic & Educational Activities"; 
             }
             // 6. Student Activities & Welfare
             else if (l.match(/activity|function|sport|game|festival|celebration|annual day|student welfare|scholarship|award|prize/)) { 
                 detectedSub = "Student Activities & Welfare"; 
             }
             // 7. Administrative & Office Expenses
             else if (l.match(/printing|stationery|postage|courier|subscription|membership|bank|office|rate/)) { 
                 detectedSub = "Administrative & Office Expenses"; 
             }
             // 8. Security & Support Services
             else if (l.match(/security|garden|ground/)) { 
                 detectedSub = "Security & Support Services"; 
             }
             // 9. Transport & Vehicle Expenses
             else if (l.match(/vehicle|insurance|travel|conveyance|transport|bus|hire charges/)) { 
                 detectedSub = "Transport & Vehicle Expenses"; 
             }
             // 10. Contingency, Statutory & Other Expenses
             else if (l.match(/advertisement|publicity|entertainment|tax|miscellaneous|misc|computer|electric equipment|depreciation|amortization/)) { 
                 detectedSub = "Contingency, Statutory & Other Expenses"; 
             }
             else { 
                 detectedSub = "Contingency, Statutory & Other Expenses"; // Default fallback
             }
        }

        const finalSub = detectedSub || currentSubCategory.trim() || "Uncategorized Ledger";

        return {
            id: Math.random().toString(36).substr(2, 9),
            category: currentCategory,
            subCategory: finalSub,
            label: p.label,
            value: p.value
        };
    });
    
    setStagingItems(prev => [...prev, ...newItems]);
    setRawText(''); 
  };

  const updateItem = (id: string, field: keyof IngestItem, val: string) => {
      setStagingItems(items => items.map(item => {
          if (item.id === id) {
              const cleanedVal = field === 'value' ? (parseFloat(val) || 0) : val;
              return { ...item, [field]: cleanedVal };
          }
          return item;
      }));
  };

  const deleteItem = (id: string) => {
      setStagingItems(items => items.filter(i => i.id !== id));
  };

  const addNewRow = () => {
      setStagingItems(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          category: currentCategory,
          subCategory: currentSubCategory || "Uncategorized Ledger",
          label: '',
          value: 0
      }]);
  };

  const nestedItems = useMemo<Record<string, Record<string, IngestItem[]>>>(() => {
    const result: Record<string, Record<string, IngestItem[]>> = {};
    stagingItems.forEach(item => {
        if (!result[item.category]) result[item.category] = {};
        if (!result[item.category][item.subCategory]) result[item.category][item.subCategory] = [];
        result[item.category][item.subCategory].push(item);
    });
    return result;
  }, [stagingItems]);

  const handleFinalSave = () => {
      if (stagingItems.length === 0) return;
      setIsSaving(true);
      
      try {
          const revenue = stagingItems.filter(i => i.category === 'Revenue').reduce((s, i) => s + i.value, 0);
          const expenses = stagingItems.filter(i => i.category === 'Expenses').reduce((s, i) => s + i.value, 0);
          const assets = stagingItems.filter(i => i.category === 'Assets').reduce((s, i) => s + i.value, 0);
          const liabilities = stagingItems.filter(i => i.category === 'Liabilities').reduce((s, i) => s + i.value, 0);

          let result: SchoolPerformance;

          if (selectedType === 'Admission') {
              const classMetrics = stagingItems.map(i => ({
                  grade: i.label || i.subCategory,
                  enrollment: i.value,
                  capacity: Math.ceil(i.value * 1.2),
                  revenue: 0,
                  withdrawals: 0,
                  admissions: 0
              }));
              const totalEnrollment = classMetrics.reduce((s, c) => s + c.enrollment, 0);
              
              result = {
                  id: `MANUAL-${selectedSchool}-${selectedWing}-${selectedYear}-${Date.now()}`,
                  timestamp: Date.now(),
                  name: selectedSchool,
                  wing: selectedWing,
                  year: selectedYear,
                  type: 'Admission',
                  fileName: 'Terminal Manual Ingest',
                  healthScore: 80,
                  riskLevel: 'Low',
                  trend: 'Stable',
                  concessions: 0,
                  monthlyCashFlow: [],
                  academics: {
                      enrollment: totalEnrollment,
                      capacity: Math.round(totalEnrollment * 1.25),
                      admissions: Math.round(totalEnrollment * 0.1),
                      withdrawals: Math.round(totalEnrollment * 0.05),
                      retentionRate: 95,
                      classMetrics: classMetrics,
                      enrollmentGrowth: 2,
                      utilizationClassrooms: 80,
                      utilizationLabs: 75
                  },
                  financials: {
                      revenue: 0, expenses: 0, surplus: 0, cashFlow: 0, capEx: 0, receivables: 0,
                      revenueBreakdown: { tuition: 0, transport: 0, hostel: 0, activities: 0, miscellaneous: 0 },
                      costBreakdown: { academicSalaries: 0, nonTeachingSalaries: 0, adminOps: 0, infrastructure: 0, utilities: 0, transport: 0, marketing: 0, technology: 0, maintenance: 0, miscellaneous: 0 },
                      detailedExpenses: [], feeRealization: 0, badDebts: 0, recurringRevenue: 0, oneTimeRevenue: 0, revenueGrowth: 0, expenseGrowth: 0, fixedCosts: 0, variableCosts: 0, breakEvenStudents: 0,
                      dropoutRevenueImpact: 0, grossSurplus: 0, operatingSurplus: 0, netSurplus: 0, grossMargin: 0, operatingMargin: 0, netMargin: 0, profitPerStudent: 0, cashBalance: 0,
                      monthlyBurnRate: 0, monthsOfRunway: 0, receivablesDays: 0, assetValue: 0, liabilitiesValue: 0, returnOnAssets: 0, maintenanceToAssetRatio: 0
                  }
              };
          } else {
              // Extract revenue components for breakdown
              const academicRev = stagingItems.filter(i => i.subCategory === 'Academic & Student Fee Revenue');
              const transportRev = academicRev.filter(i => i.label.toLowerCase().match(/transport|bus/)).reduce((s,i) => s + i.value, 0);
              const tuitionRev = academicRev.reduce((s,i) => s + i.value, 0) - transportRev;

              const miscRev = stagingItems.filter(i => i.subCategory === 'Other Operating Revenue').reduce((s,i) => s + i.value, 0);
              const financialRev = stagingItems.filter(i => i.subCategory === 'Financial & Investment Income').reduce((s,i) => s + i.value, 0);

              result = mapFinanceData(selectedSchool, selectedWing, selectedYear, {
                  rev: revenue,
                  exp: expenses,
                  surplus: revenue - expenses,
                  assets: assets,
                  liabilities: liabilities,
                  heads: stagingItems.map(i => ({ category: i.category, subCategory: i.subCategory, head: i.label, amount: i.value })),
                  revBreakdown: { 
                      tuition: tuitionRev, 
                      transport: transportRev, 
                      misc: miscRev + financialRev,
                      hostel: 0,
                      activities: 0
                  }
              }, "Terminal Manual Ingest");
          }

          if (onBulkUpdate) onBulkUpdate(result);
          setActiveTab('history');
      } catch (e) {
          console.error(e);
          alert("Persistence Error: Secure Institutional Server rejected the transaction. Verify data types.");
      } finally {
          setIsSaving(false);
      }
  };

  // Group Datasets by School for the History Tab
  const groupedDatasets = useMemo<Record<string, SchoolPerformance[]>>(() => {
    const groups: Record<string, SchoolPerformance[]> = {};
    datasets.forEach(d => {
        if (!groups[d.name]) groups[d.name] = [];
        groups[d.name].push(d);
    });
    return groups;
  }, [datasets]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
      
      {/* Header Bar */}
      <div className="px-10 py-5 bg-slate-900 text-white flex justify-between items-center shadow-lg border-b border-white/10 shrink-0">
          <div className="flex items-center gap-5">
              <div className="p-2.5 bg-rose-600 rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center text-white"><Grid3X3 size={24} strokeWidth={2.5} /></div>
              <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">Insight360 <span className="text-sky-400 font-medium">Data Terminal</span></h2>
                  <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-bold">Workspace: Unified Institutional Ingestion</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex bg-[#0f172a] p-1 rounded-xl mr-2">
                  <button onClick={() => setActiveTab('ingest')} className={`px-6 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all ${activeTab === 'ingest' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}>WORKSPACE</button>
                  <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-[10px] font-bold tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}>AUDIT LOG</button>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {activeTab === 'ingest' ? (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
                  
                  {/* LEFT: INGESTION CONTROL (3/12) */}
                  <div className="lg:col-span-3 border-r border-slate-200 bg-white p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shadow-sm z-20">
                      
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context Config</label>
                          <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase">School Branch</label>
                                <select 
                                    value={selectedSchool}
                                    onChange={(e) => setSelectedSchool(e.target.value as SchoolBranch)}
                                    disabled={contextSchool !== 'ALL'}
                                    className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[11px] font-bold text-slate-900 focus:border-sky-500 outline-none transition-all ${contextSchool !== 'ALL' ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
                                >
                                    {DARSHAN_SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                {hasMultipleWings && (
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-slate-400 font-bold uppercase">Wing</label>
                                        <select 
                                            value={selectedWing}
                                            onChange={(e) => setSelectedWing(e.target.value)}
                                            disabled={contextSchool !== 'ALL' && contextWing !== 'ALL'}
                                            className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[11px] font-bold text-slate-900 focus:border-sky-500 outline-none transition-all ${contextSchool !== 'ALL' && contextWing !== 'ALL' ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'cursor-pointer'}`}
                                        >
                                            {availableWings.map(w => <option key={w} value={w}>{w}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className={`space-y-1 ${!hasMultipleWings ? 'col-span-2' : ''}`}>
                                    <label className="text-[9px] text-slate-400 font-bold uppercase">Audit Year</label>
                                    <select 
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[11px] font-bold text-slate-900 focus:border-sky-500 outline-none transition-all cursor-pointer"
                                    >
                                        {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                              </div>
                          </div>
                          <div className="p-2 bg-sky-50 border border-sky-100 rounded-lg text-[9px] text-sky-700 flex gap-2 items-start">
                             <Info size={12} className="shrink-0 mt-0.5" />
                             <span>Data is autosaved to the selected School, Wing & Year scope.</span>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modality</label>
                          <div className="flex p-1 bg-slate-100 rounded-xl">
                              <button onClick={() => handleTypeChange('Finance')} className={`flex-1 py-2 rounded-lg text-[9px] font-black tracking-widest transition-all ${selectedType === 'Finance' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}>FINANCE</button>
                              <button onClick={() => handleTypeChange('Admission')} className={`flex-1 py-2 rounded-lg text-[9px] font-black tracking-widest transition-all ${selectedType === 'Admission' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>ACADEMICS</button>
                          </div>
                      </div>

                      {/* File Upload Button */}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quick Import</label>
                          <div className="relative">
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 hover:border-slate-300 transition-all group"
                            >
                                <Upload size={16} className="text-slate-400 group-hover:text-slate-600" />
                                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Upload Excel File</span>
                            </button>
                          </div>
                      </div>

                      {/* ... rest of left panel ... */}
                      <div className="space-y-4 border-t border-slate-100 pt-4">
                          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Layers size={14} className="text-rose-600"/> 01. Segment</h3>
                          <div className="grid grid-cols-2 gap-2">
                              {categories.map(cat => (
                                  <button 
                                      key={cat} 
                                      onClick={() => setCurrentCategory(cat)}
                                      className={`text-left px-3 py-3 rounded-lg border text-[10px] font-bold transition-all ${currentCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                                  >
                                      {cat}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* ... (Sub Category and Paste Logic remains same) ... */}
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><BoxSelect size={14} className="text-rose-600"/> 02. Sub-Category</h3>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">OPTIONAL</span>
                          </div>
                          <input 
                              type="text" 
                              value={currentSubCategory}
                              onChange={(e) => setCurrentSubCategory(e.target.value)}
                              placeholder="e.g. 'Repairs', 'Tuition'" 
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs font-semibold focus:border-sky-500 outline-none"
                          />
                      </div>

                      <div className="space-y-4">
                           <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><ClipboardList size={14} className="text-rose-600"/> 03. Raw Data</h3>
                           <textarea 
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono focus:border-sky-500 outline-none resize-none"
                                placeholder={`Paste rows from Excel here...\nFormat: [Description] [Amount]\nExample: "Salary Staff 450000"`}
                           />
                           <button 
                                onClick={handleAutoParse}
                                disabled={!rawText.trim()}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold tracking-widest hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                           >
                               <Sparkles size={14} /> PROCESS DATA
                           </button>
                      </div>

                  </div>

                  {/* RIGHT: DATA STAGING (9/12) */}
                  <div className="lg:col-span-9 bg-slate-50 flex flex-col h-full overflow-hidden relative">
                      
                      {/* Staging Header */}
                      <div className="px-8 py-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                          <div>
                              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <TableProperties size={18} className="text-sky-500" /> 
                                  Staging Worksheet
                              </h3>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Review and verify data before committing to the institutional repository.</p>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="text-right">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Worksheet Total</p>
                                  <p className="text-lg font-black text-slate-900 tabular-nums">
                                      {worksheetTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                  </p>
                              </div>
                              <div className="h-8 w-px bg-slate-200"></div>
                              <button onClick={() => setStagingItems([])} className="p-2 text-slate-400 hover:text-rose-600 transition-colors" title="Clear Worksheet">
                                  <RefreshCcw size={18} />
                              </button>
                              <button 
                                  onClick={handleFinalSave}
                                  disabled={stagingItems.length === 0 || isSaving}
                                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                              >
                                  {isSaving ? "COMMITTING..." : "COMMIT TO REPOSITORY"} <ArrowRightLeft size={14} />
                              </button>
                          </div>
                      </div>

                      {/* Data Grid */}
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                          {Object.keys(nestedItems).length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                  <PackageSearch size={48} className="mb-4" />
                                  <p className="text-sm font-bold">Worksheet Empty</p>
                                  <p className="text-xs">Paste data on the left to begin.</p>
                              </div>
                          ) : (
                              <div className="space-y-8 pb-20">
                                  {/* ... (Same grid mapping logic) ... */}
                                  {Object.entries(nestedItems).map(([cat, subCats]) => (
                                      <div key={cat} className="space-y-4">
                                          <div className="flex items-center gap-3">
                                              <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-md">{cat}</span>
                                              <div className="h-px bg-slate-200 flex-1"></div>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                              {Object.entries(subCats).map(([sub, items]) => (
                                                  <div key={sub} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider truncate max-w-[150px]" title={sub}>{sub}</span>
                                                          <span className="text-[10px] font-mono font-bold text-slate-500">
                                                              {items.reduce((acc, i) => acc + i.value, 0).toLocaleString()}
                                                          </span>
                                                      </div>
                                                      <div className="flex-1 p-2 space-y-1 overflow-y-auto max-h-[200px] custom-scrollbar">
                                                          {items.map(item => (
                                                              <div key={item.id} className="flex items-center gap-2 group p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                                                  <input 
                                                                      type="text" 
                                                                      value={item.label}
                                                                      onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                                                                      className="flex-1 bg-transparent text-xs font-medium text-slate-700 focus:text-sky-600 outline-none truncate"
                                                                  />
                                                                  <input 
                                                                      type="number" 
                                                                      value={item.value}
                                                                      onChange={(e) => updateItem(item.id, 'value', e.target.value)}
                                                                      className="w-20 bg-transparent text-right text-xs font-mono text-slate-500 focus:text-slate-900 outline-none"
                                                                  />
                                                                  <button 
                                                                      onClick={() => deleteItem(item.id)}
                                                                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                  >
                                                                      <X size={12} />
                                                                  </button>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Add Manual Row FAB */}
                      <button 
                          onClick={addNewRow}
                          className="absolute bottom-8 right-8 w-12 h-12 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 flex items-center justify-center hover:scale-105 transition-transform z-20"
                          title="Add Empty Row"
                      >
                          <Plus size={24} />
                      </button>

                  </div>

              </div>
          ) : (
              <div className="flex-1 bg-slate-50 p-8 overflow-y-auto custom-scrollbar">
                  {/* ... History View ... */}
                  <div className="max-w-7xl mx-auto space-y-10">
                      {/* ... Header ... */}
                      <div className="flex justify-between items-end border-b-2 border-slate-200 pb-8">
                          <div>
                              <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Audit Repository</h3>
                              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Institutional Data Logs • Grouped by Branch</p>
                          </div>
                          <div className="text-[10px] font-black bg-white border border-slate-200 px-5 py-2.5 rounded-full text-slate-400 tracking-widest uppercase">Total Records: {datasets.length}</div>
                      </div>

                      {Object.keys(groupedDatasets).length === 0 ? (
                          <div className="py-40 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
                               <PackageSearch size={64} className="mx-auto mb-4 opacity-10" />
                               <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No Published Data</p>
                          </div>
                      ) : (
                          <div className="space-y-6">
                            {Object.entries(groupedDatasets).map(([schoolName, schoolRecords]: [string, SchoolPerformance[]]) => (
                                <div key={schoolName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                    <button 
                                        onClick={() => setExpandedSchool(expandedSchool === schoolName ? null : schoolName)}
                                        className="w-full px-6 py-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedSchool === schoolName ? <ChevronDown size={18} className="text-blue-500"/> : <ChevronRight size={18} className="text-slate-400"/>}
                                            <h4 className="font-bold text-slate-800 uppercase tracking-wide">{schoolName}</h4>
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{schoolRecords.length} Records</span>
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">Last Update: {new Date(Math.max(...schoolRecords.map(r => r.timestamp))).toLocaleDateString()}</div>
                                    </button>
                                    
                                    {expandedSchool === schoolName && (
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                                            {[...schoolRecords].sort((a,b) => b.year.localeCompare(a.year)).map((data) => (
                                                <div key={data.id} className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:border-blue-400 transition-all shadow-sm group">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className={`p-2 rounded-lg ${data.type === 'Finance' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                                {data.type === 'Finance' ? <Activity size={18}/> : <School size={18}/>}
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="block text-[9px] font-black text-slate-300 uppercase tracking-widest">{data.year}</span>
                                                                <span className="block text-[9px] font-bold text-rose-500 uppercase">{data.wing}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {data.type === 'Finance' ? (
                                                            <div className="space-y-2 mb-4">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">Revenue:</span>
                                                                    <span className="font-bold text-slate-900">₹{(data.financials.revenue / 100000).toFixed(2)} L</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs border-t border-slate-100 pt-1">
                                                                    <span className="text-slate-500">Surplus:</span>
                                                                    <span className={`font-bold ${data.financials.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{(data.financials.surplus / 100000).toFixed(2)} L</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2 mb-4">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-slate-500">Enrollment:</span>
                                                                    <span className="font-bold text-slate-900">{data.academics.enrollment}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                                        <button 
                                                            onClick={() => handleManualLoad(data)}
                                                            className="flex-1 text-[10px] font-bold text-blue-600 bg-blue-50 py-2 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Pencil size={12}/> Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => onDelete(data.id)} 
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default DataManagementPanel;
