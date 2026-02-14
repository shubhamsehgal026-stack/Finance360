
import React, { useMemo, useState } from 'react';
import { AnalysisModule, SchoolBranch, SchoolPerformance, ExpenseItem } from '../types';
import { downloadToExcel, downloadChartAsPng } from '../utils/exportHelper';
import { generateDetailedReport } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Area, AreaChart, PieChart, Pie, Cell, Line
} from 'recharts';
import { 
  TrendingDown, TrendingUp, DollarSign, Users, Activity, 
  Percent, Wallet, ArrowDownRight, ArrowUpRight,
  FileText, Truck, Layers, Clock,
  School, UserPlus, UserMinus, PieChart as PieChartIcon, Hammer, Building,
  Trophy, AlertOctagon, Download, Camera, Award, Loader2, Printer, Sparkles,
  TableProperties, Scale
} from 'lucide-react';

interface DashboardProps {
  module: AnalysisModule;
  scope: SchoolBranch | 'ALL';
  data: SchoolPerformance[];
  canDownload?: boolean;
}

// Helper types for local logic
type EnrichedExpenseItem = ExpenseItem & { year: string; schoolName: string };
interface CostGroup {
  key: string;
  items: EnrichedExpenseItem[];
  total: number;
}

const COLORS = [
  '#e11d48', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', 
  '#f43f5e', '#0284c7', '#059669', '#d97706', '#6366F1',
  '#EC4899', '#14B8A6', '#F59E0B'
];

const formatCurrency = (val: number) => {
  if (val === undefined || val === null) return '₹0';
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
};

const MetricCard = ({ title, value, subtext, trend, trendUp, icon, color = "sky" }: any) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
    <div className={`absolute top-0 right-0 p-4 opacity-10 text-${color}-500`}>
        {icon}
    </div>
    <div className="flex flex-col h-full justify-between relative z-10">
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        {trend && (
            <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{trend}</span>
            </div>
        )}
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="mb-0">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
);

interface ChartWidgetProps {
    id: string; 
    title: string;
    subtitle?: string;
    data: any[]; 
    children: React.ReactNode;
    className?: string;
    height?: number | string;
    canDownload?: boolean;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ id, title, subtitle, data, children, className = "", height = 300, canDownload = false }) => {
    const handleDownloadImage = () => downloadChartAsPng(id, title.replace(/\s+/g, '_'));
    const handleDownloadExcel = () => downloadToExcel(data, title.replace(/\s+/g, '_'));

    return (
        <div id={id} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <SectionHeader title={title} subtitle={subtitle} />
                {canDownload && (
                    <div className="flex items-center gap-1">
                        <button onClick={handleDownloadImage} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Download Image"><Camera size={18} /></button>
                        <button onClick={handleDownloadExcel} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download Excel"><FileText size={18} /></button>
                    </div>
                )}
            </div>
            <div style={{ height: height, width: '100%' }}>{children}</div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ module, scope, data, canDownload = false }) => {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string>("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const filteredData = useMemo(() => {
    return scope === 'ALL' ? data : data.filter(s => s.name === scope);
  }, [data, scope]);

  const uniqueYears = useMemo(() => Array.from(new Set(filteredData.map(d => d.year))).sort(), [filteredData]);
  const isMultiYear = uniqueYears.length > 1;
  const latestYear = uniqueYears[uniqueYears.length - 1];
  const latestYearData = useMemo(() => filteredData.filter(d => d.year === latestYear), [filteredData, latestYear]);

  const aggregates = useMemo(() => {
    const initial = { 
        revenue: 0, expenses: 0, surplus: 0, admissions: 0, withdrawals: 0, concessions: 0, capEx: 0,
        fixedCosts: 0, variableCosts: 0, grossSurplus: 0, operatingSurplus: 0,
        enrollment: 0, capacity: 0, cashBalance: 0, monthlyBurnRate: 0, assetValue: 0,
        revenueBreakdown: { tuition: 0, transport: 0, hostel: 0, activities: 0, miscellaneous: 0 }
    };
    
    if (!filteredData || filteredData.length === 0) return initial;

    const flowMetrics = filteredData.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.financials?.revenue || 0),
      expenses: acc.expenses + (curr.financials?.expenses || 0),
      surplus: acc.surplus + (curr.financials?.surplus || 0),
      admissions: acc.admissions + (curr.academics?.admissions || 0),
      withdrawals: acc.withdrawals + (curr.academics?.withdrawals || 0),
      concessions: acc.concessions + (curr.concessions || 0),
      capEx: acc.capEx + (curr.financials?.capEx || 0),
      fixedCosts: acc.fixedCosts + (curr.financials?.fixedCosts || 0),
      variableCosts: acc.variableCosts + (curr.financials?.variableCosts || 0),
      grossSurplus: acc.grossSurplus + (curr.financials?.grossSurplus || 0),
      operatingSurplus: acc.operatingSurplus + (curr.financials?.operatingSurplus || 0),
      revenueBreakdown: {
        tuition: acc.revenueBreakdown.tuition + (curr.financials?.revenueBreakdown?.tuition || 0),
        transport: acc.revenueBreakdown.transport + (curr.financials?.revenueBreakdown?.transport || 0),
        hostel: acc.revenueBreakdown.hostel + (curr.financials?.revenueBreakdown?.hostel || 0),
        activities: acc.revenueBreakdown.activities + (curr.financials?.revenueBreakdown?.activities || 0),
        miscellaneous: acc.revenueBreakdown.miscellaneous + (curr.financials?.revenueBreakdown?.miscellaneous || 0),
      },
    }), initial);

    const snapshot = latestYearData.reduce((acc, curr) => ({
         enrollment: acc.enrollment + (curr.academics?.enrollment || 0),
         capacity: acc.capacity + (curr.academics?.capacity || 0),
         cashBalance: acc.cashBalance + (curr.financials?.cashBalance || 0),
         monthlyBurnRate: acc.monthlyBurnRate + (curr.financials?.monthlyBurnRate || 0),
         assetValue: acc.assetValue + (curr.financials?.assetValue || 0),
    }), { enrollment: 0, capacity: 0, cashBalance: 0, monthlyBurnRate: 0, assetValue: 0 });

    return { ...flowMetrics, ...snapshot };
  }, [filteredData, latestYearData]);

  const trendData = useMemo(() => {
    // Generate trend data even for single year to allow consistent chart rendering
    if (!filteredData || filteredData.length === 0) return [];
    
    const groups: Record<string, any> = {};
    filteredData.forEach(d => {
        if (!groups[d.year]) groups[d.year] = { year: d.year, revenue: 0, expenses: 0, surplus: 0, enrollment: 0 };
        groups[d.year].revenue += (d.financials?.revenue || 0);
        groups[d.year].expenses += (d.financials?.expenses || 0);
        groups[d.year].surplus += (d.financials?.surplus || 0);
        groups[d.year].enrollment += (d.academics?.enrollment || 0);
    });
    return Object.values(groups).sort((a: any, b: any) => a.year.localeCompare(b.year));
  }, [filteredData]);

  // Extracts detailed expense items (category === 'Expenses')
  const expenseEntries = useMemo<EnrichedExpenseItem[]>(() => {
    if (!filteredData) return [];
    return filteredData.flatMap(school => 
        (school.financials?.detailedExpenses || [])
            .filter(exp => exp && exp.category === 'Expenses')
            .map(exp => ({...exp, year: school.year, schoolName: school.name}))
    );
  }, [filteredData]);

  // Extracts detailed revenue items (category === 'Revenue') for granular analysis
  const revenueEntries = useMemo<EnrichedExpenseItem[]>(() => {
    if (!filteredData) return [];
    return filteredData.flatMap(school => 
        (school.financials?.detailedExpenses || [])
            .filter(item => item && item.category === 'Revenue')
            .map(item => ({...item, year: school.year, schoolName: school.name}))
    );
  }, [filteredData]);

  const totalFilteredExpense = useMemo(() => {
    return expenseEntries.reduce((sum, e) => sum + e.amount, 0);
  }, [expenseEntries]);

  // --- TOP LEVEL HOOKS FOR COST MODULE ---
  // These MUST be at the top level, not inside renderCosts, to avoid React Error #310
  
  const groupedExpenses = useMemo<Record<string, EnrichedExpenseItem[]>>(() => {
      const groups: Record<string, EnrichedExpenseItem[]> = {};
      expenseEntries.forEach(e => {
          const key = e.subCategory || "Uncategorized";
          if (!groups[key]) groups[key] = [];
          groups[key].push(e);
      });
      return groups;
  }, [expenseEntries]);

  const sortedCostGroups = useMemo<CostGroup[]>(() => {
      return Object.entries(groupedExpenses)
          .map(([key, items]: [string, EnrichedExpenseItem[]]) => {
              const sortedItems = [...items];
              if (scope === 'ALL') {
                  // Advanced Sorting: Branch A-Z -> Year Descending (Newest First)
                  sortedItems.sort((a, b) => {
                      const branchCompare = a.schoolName.localeCompare(b.schoolName);
                      if (branchCompare !== 0) return branchCompare;
                      return b.year.localeCompare(a.year); // Descending year
                  });
              } else {
                  // Standard View: Sort by Amount Descending
                  sortedItems.sort((a, b) => b.amount - a.amount);
              }

              return {
                  key,
                  items: sortedItems,
                  total: items.reduce((sum, i) => sum + i.amount, 0)
              };
          })
          .sort((a, b) => b.total - a.total); // Sort groups by total size
  }, [groupedExpenses, scope]);

  // ---------------------------------------

  const costPieData = useMemo(() => {
    const groupedBySubCategory: Record<string, number> = {};
    expenseEntries.forEach(item => {
        const sub = item.subCategory || "Uncategorized";
        groupedBySubCategory[sub] = (groupedBySubCategory[sub] || 0) + item.amount;
    });
    return Object.entries(groupedBySubCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [expenseEntries]);

  const costBarData = useMemo(() => {
    if (selectedSubCategory) {
        const headSums: Record<string, number> = {};
        expenseEntries.filter(e => (e.subCategory || "Uncategorized") === selectedSubCategory).forEach(e => {
            headSums[e.head] = (headSums[e.head] || 0) + e.amount;
        });
        return Object.entries(headSums)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 15);
    }
    return costPieData.slice(0, 15).map(d => ({ name: d.name, value: d.value }));
  }, [selectedSubCategory, expenseEntries, costPieData]);

  const renderTrendChart = (dataKey: string, name: string, color: string, chartId: string) => (
      <ChartWidget 
        id={chartId} 
        title={isMultiYear ? "Performance Trend" : "Annual Performance"} 
        subtitle={isMultiYear ? `Multi-year ${name} Analysis` : `Single Year ${name} Snapshot`} 
        data={trendData} 
        height={280} 
        canDownload={canDownload}
      >
          <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(val) => `${(val/100000).toFixed(0)}L`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey={dataKey} name={name} fill={color} fillOpacity={0.6} radius={[4,4,0,0]} barSize={isMultiYear ? undefined : 60} />
                  {isMultiYear && <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot />}
              </ComposedChart>
          </ResponsiveContainer>
      </ChartWidget>
  );

  const renderHome = () => {
    const homeSortedData = [...latestYearData].sort((a,b) => (b.financials?.netSurplus || 0) - (a.financials?.netSurplus || 0));
    const atRiskUnits = latestYearData.filter(s => (s.financials?.netSurplus || 0) < 0 || s.riskLevel === 'High' || s.riskLevel === 'Critical');
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Revenue" value={formatCurrency(aggregates.revenue)} subtext="Group Total" icon={<DollarSign />} color="emerald" />
          <MetricCard title="Net Surplus" value={formatCurrency(aggregates.surplus)} trendUp={aggregates.surplus > 0} icon={<Activity />} color="sky" />
          <MetricCard title="Enrollment" value={aggregates.enrollment.toLocaleString()} subtext="Active Students" icon={<Users />} color="rose" />
          <MetricCard title="Occupancy" value={`${aggregates.capacity > 0 ? Math.round((aggregates.enrollment / aggregates.capacity) * 100) : 0}%`} icon={<PieChartIcon />} color="amber" />
        </div>
        
        {/* Trend Chart now renders always, even for single year, to avoid layout shifts */}
        {renderTrendChart("revenue", "Revenue", "#0f172a", "home-rev-trend")}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <ChartWidget id="home-branch-overview" title="Branch Comparison" subtitle="Revenue vs Expenses" data={homeSortedData.slice(0, 10)} height={320} canDownload={canDownload}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={homeSortedData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} angle={-15} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(val) => `${(val/100000).toFixed(0)}L`} />
                      <Tooltip formatter={(val: number) => formatCurrency(val)} />
                      <Legend />
                      <Bar dataKey="financials.revenue" name="Revenue" fill="#0f172a" radius={[4,4,0,0]} />
                      <Bar dataKey="financials.expenses" name="Expenses" fill="#94a3b8" radius={[4,4,0,0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartWidget>
            </div>
            <div className="bg-white p-6 rounded-xl border border-rose-200">
                <h3 className="font-bold text-rose-600 flex items-center gap-2 mb-4"><AlertOctagon size={18} /> At-Risk Units</h3>
                <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                    {atRiskUnits.length === 0 ? <p className="text-sm text-slate-400">No schools flagged.</p> : atRiskUnits.map(s => (
                        <div key={s.id} className="p-3 bg-rose-50 rounded-lg flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">{s.name}</span>
                            <span className="text-xs font-bold text-rose-600">{formatCurrency(s.financials.netSurplus)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  };

  const renderRevenue = () => {
    // Determine data source: Prefer granular revenue entries if available
    const hasDetailedRevenue = revenueEntries.length > 0;
    
    let revenuePieData = [];
    let tableRows = [];
    const totalRev = aggregates.revenue;

    if (hasDetailedRevenue) {
        // Group by SubCategory for Pie Chart (High Level)
        const bySubCat: Record<string, number> = {};
        revenueEntries.forEach(item => {
            const key = item.subCategory || "Uncategorized";
            bySubCat[key] = (bySubCat[key] || 0) + item.amount;
        });
        revenuePieData = Object.entries(bySubCat)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value);

        // Group by Head for Table (Detailed Level)
        const byHead: Record<string, {amount: number, sub: string}> = {};
        revenueEntries.forEach(item => {
            const key = item.head || "Unknown";
            if (!byHead[key]) byHead[key] = { amount: 0, sub: item.subCategory };
            byHead[key].amount += item.amount;
        });
        
        tableRows = Object.entries(byHead).map(([head, data]) => ({
            category: head,
            subCategory: data.sub,
            amount: data.amount,
            percentage: totalRev > 0 ? (data.amount / totalRev) * 100 : 0
        })).sort((a,b) => b.amount - a.amount);

    } else {
        // Fallback to legacy breakdown if no detailed items exist
        revenuePieData = [
            { name: 'Tuition Fees', value: aggregates.revenueBreakdown.tuition },
            { name: 'Transport Fees', value: aggregates.revenueBreakdown.transport },
            { name: 'Hostel Fees', value: aggregates.revenueBreakdown.hostel },
            { name: 'Activities & Events', value: aggregates.revenueBreakdown.activities },
            { name: 'Miscellaneous', value: aggregates.revenueBreakdown.miscellaneous },
        ].filter(d => d.value > 0).sort((a,b) => b.value - a.value);

        tableRows = revenuePieData.map(item => ({
            category: item.name,
            subCategory: 'General',
            amount: item.value,
            percentage: totalRev > 0 ? (item.value / totalRev) * 100 : 0
        }));
    }

    // Export Handler
    const handleDownloadRevenueTable = () => {
        const exportData = tableRows.map(row => ({
            "Revenue Source": row.category,
            "Category": row.subCategory,
            "Amount (INR)": row.amount,
            "Share (%)": row.percentage.toFixed(2) + '%'
        }));
        exportData.push({
            "Revenue Source": "TOTAL",
            "Category": "-",
            "Amount (INR)": totalRev,
            "Share (%)": "100.00%"
        });
        downloadToExcel(exportData, `Revenue_Analysis_${scope}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard title="Total Revenue" value={formatCurrency(aggregates.revenue)} subtext="Consolidated Inflow" icon={<DollarSign />} color="emerald" />
                <MetricCard title="Tuition Dependence" value={`${totalRev > 0 ? ((aggregates.revenueBreakdown.tuition / totalRev) * 100).toFixed(1) : 0}%`} subtext="% of Total Revenue" icon={<Percent />} color="sky" />
                 <MetricCard title="Non-Academic Revenue" value={formatCurrency(aggregates.revenue - aggregates.revenueBreakdown.tuition)} subtext="Transport, Hostel, etc." icon={<Wallet />} color="rose" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart (Always Visible) */}
                {renderTrendChart("revenue", "Revenue Growth", "#10b981", "rev-trend-chart")}

                {/* Pie Chart */}
                <ChartWidget id="rev-mix-pie" title="Revenue Mix" subtitle="Composition by Source" data={revenuePieData} height={350} canDownload={canDownload}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={revenuePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {revenuePieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartWidget>
            </div>

            {/* Detailed Table Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Revenue Composition Detail</h3>
                        <p className="text-xs text-slate-500">Breakdown of income streams with percentage contributions</p>
                    </div>
                    {canDownload && (
                        <button 
                            onClick={handleDownloadRevenueTable}
                            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg border border-slate-200 transition-colors text-sm font-medium"
                        >
                            <Download size={16} /> Export Data
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Source Category</th>
                                <th className="px-6 py-4">Contribution %</th>
                                <th className="px-6 py-4 text-right">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                            <div>
                                                <div>{row.category}</div>
                                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{row.subCategory}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-12 text-right font-mono text-xs">{row.percentage.toFixed(1)}%</span>
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full" 
                                                    style={{ width: `${row.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                                        {formatCurrency(row.amount)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                                <td className="px-6 py-4 uppercase tracking-widest">Total Revenue</td>
                                <td className="px-6 py-4">100.0%</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(totalRev)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const renderCosts = () => {
    // Note: Hooks previously here were causing Re-render loop errors because this function 
    // is called conditionally. They have been moved to the top of Dashboard component.
    // We now use sortedCostGroups directly.

    const handleDownloadFullLedger = () => {
        const exportData = sortedCostGroups.flatMap(group => 
            group.items.map(item => ({
                "Expense Category": group.key,
                "School Branch": item.schoolName,
                "Year": item.year,
                "Description / Head": item.head,
                "Amount (INR)": item.amount
            }))
        );
        downloadToExcel(exportData, `Detailed_Expense_Ledger_${scope}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard title="Expenditure Analysis" value={formatCurrency(totalFilteredExpense)} subtext="Total Ingested Expenses" icon={<Wallet />} color="rose" />
                <MetricCard title="Operational Burn" value={formatCurrency(totalFilteredExpense / 12)} subtext="Avg. Monthly Inflow Requirement" icon={<Clock />} color="slate" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartWidget id="cost-dist-pie" title="Expense Distribution" subtitle="Grouped by user-defined sub-categories" data={costPieData} height={380} canDownload={canDownload}>
                    <div className="flex justify-end -mt-8 mb-2">
                        {selectedSubCategory && <button onClick={() => setSelectedSubCategory(null)} className="text-xs text-sky-600 font-bold hover:underline">Reset Drilldown</button>}
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={costPieData} 
                                innerRadius={60} 
                                outerRadius={100} 
                                dataKey="value" 
                                paddingAngle={2}
                                onClick={(d) => setSelectedSubCategory(d.name === selectedSubCategory ? null : d.name)}
                                cursor="pointer"
                            >
                                {costPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke={selectedSubCategory === costPieData[i].name ? '#000' : 'none'} strokeWidth={2} />)}
                            </Pie>
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartWidget>
                <ChartWidget id="cost-breakdown-bar" title={selectedSubCategory ? `Head Analysis: ${selectedSubCategory}` : "Top 15 Primary Expense Heads"} data={costBarData} height={380} canDownload={canDownload}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costBarData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" tickFormatter={(v) => `${(v/100000).toFixed(0)}L`} />
                            <YAxis type="category" dataKey="name" width={140} tick={{fontSize: 10}} />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Bar dataKey="value" name="Amount" fill={selectedSubCategory ? "#0ea5e9" : "#e11d48"} radius={[0,4,4,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartWidget>
            </div>

            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><TableProperties size={20}/> Detailed Expense Ledger</h3>
                    {canDownload && (
                        <button 
                            onClick={handleDownloadFullLedger}
                            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 transition-colors text-xs font-bold uppercase tracking-wide"
                        >
                            <Download size={14} /> Export Full Ledger
                        </button>
                    )}
                </div>
                
                {sortedCostGroups.map((group) => (
                    <div key={group.key} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">{group.key}</h4>
                                <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{group.items.length} Items</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-400 font-medium mr-2">Sub-total</span>
                                <span className="text-sm font-black text-slate-900">{formatCurrency(group.total)}</span>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        {scope === 'ALL' && <th className="px-6 py-3 text-left">School Branch</th>}
                                        <th className="px-6 py-3 text-left">Year</th>
                                        <th className="px-6 py-3 text-left w-1/3">Description / Ledger Head</th>
                                        <th className="px-6 py-3 text-center">Share of Total</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {group.items.map((item, idx) => {
                                        const share = totalFilteredExpense > 0 ? (item.amount / totalFilteredExpense) * 100 : 0;
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                {scope === 'ALL' && (
                                                    <td className="px-6 py-3 font-bold text-slate-700 text-xs">
                                                        {item.schoolName}
                                                    </td>
                                                )}
                                                <td className="px-6 py-3 font-mono text-slate-500 text-xs">
                                                    {item.year}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-slate-700">
                                                    {item.head}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="text-xs text-slate-500 font-mono">{share.toFixed(2)}%</span>
                                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${share}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderProfitability = () => {
    const margin = aggregates.revenue > 0 ? (aggregates.surplus / aggregates.revenue) * 100 : 0;
    const expenseRatio = aggregates.revenue > 0 ? (aggregates.expenses / aggregates.revenue) * 100 : 0;

    // Prepare data for "Revenue Allocation" (Simple view of Expenses vs Surplus)
    const allocationData = [
        { name: 'Operational Expenses', value: aggregates.expenses, color: '#e11d48' },
        { name: 'Net Surplus', value: aggregates.surplus > 0 ? aggregates.surplus : 0, color: '#10b981' }
    ];

    // School Comparison Data for Profitability (if scope is ALL)
    const schoolProfitabilityData = latestYearData
        .map(s => ({
            name: s.name,
            revenue: s.financials.revenue,
            expenses: s.financials.expenses,
            surplus: s.financials.surplus,
            margin: s.financials.revenue > 0 ? (s.financials.surplus / s.financials.revenue) * 100 : 0
        }))
        .sort((a, b) => b.surplus - a.surplus);

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                    title="Net Operating Surplus" 
                    value={formatCurrency(aggregates.surplus)} 
                    subtext={aggregates.surplus >= 0 ? "Positive Cash Generation" : "Deficit - Attention Required"} 
                    trendUp={aggregates.surplus >= 0}
                    icon={<Activity />} 
                    color={aggregates.surplus >= 0 ? "emerald" : "rose"} 
                />
                <MetricCard 
                    title="Net Profit Margin" 
                    value={`${margin.toFixed(2)}%`} 
                    subtext="Retained Earnings %" 
                    trendUp={margin > 15}
                    icon={<Percent />} 
                    color="sky" 
                />
                <MetricCard 
                    title="Expense Ratio" 
                    value={`${expenseRatio.toFixed(2)}%`} 
                    subtext="% of Revenue Spent" 
                    trendUp={expenseRatio < 85}
                    icon={<TrendingDown />} 
                    color="amber" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart: Revenue vs Cost Trend */}
                <ChartWidget 
                    id="prof-trend-chart" 
                    title="Financial Performance Trend" 
                    subtitle="Revenue vs Expenses vs Surplus over time" 
                    data={trendData} 
                    height={350} 
                    canDownload={canDownload}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" />
                            <YAxis yAxisId="left" tickFormatter={(val) => `${(val/100000).toFixed(0)}L`} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${(val/100000).toFixed(0)}L`} hide />
                            <Tooltip formatter={(val: number) => formatCurrency(val)} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="revenue" name="Total Revenue" fill="#0f172a" radius={[4,4,0,0]} barSize={20} />
                            <Bar yAxisId="left" dataKey="expenses" name="Total Expenses" fill="#e11d48" radius={[4,4,0,0]} barSize={20} />
                            <Area yAxisId="left" type="monotone" dataKey="surplus" name="Net Surplus" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartWidget>

                 {/* Chart: Profitability Distribution or Ranking */}
                 {scope === 'ALL' ? (
                     <ChartWidget 
                        id="prof-ranking-chart" 
                        title="Branch Profitability Ranking" 
                        subtitle={`Net Surplus Analysis (${latestYear})`} 
                        data={schoolProfitabilityData} 
                        height={350} 
                        canDownload={canDownload}
                     >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={schoolProfitabilityData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" tickFormatter={(val) => `${(val/100000).toFixed(0)}L`} />
                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10}} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Legend />
                                <Bar dataKey="surplus" name="Net Surplus" radius={[0,4,4,0]}>
                                    {schoolProfitabilityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.surplus >= 0 ? '#10b981' : '#e11d48'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                     </ChartWidget>
                 ) : (
                     <ChartWidget 
                        id="prof-allocation-pie" 
                        title="Revenue Allocation" 
                        subtitle="Expenses vs Retained Surplus" 
                        data={allocationData} 
                        height={350} 
                        canDownload={canDownload}
                     >
                        <ResponsiveContainer width="100%" height="100%">
                             <PieChart>
                                <Pie
                                    data={allocationData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {allocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                    <tspan x="50%" dy="-1em" fontSize="12" fill="#64748b">Net Margin</tspan>
                                    <tspan x="50%" dy="1.6em" fontSize="24" fontWeight="bold" fill="#0f172a">{margin.toFixed(1)}%</tspan>
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                     </ChartWidget>
                 )}
            </div>

            {/* Detailed Profitability Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <SectionHeader title="Profitability Ledger" subtitle="Detailed breakdown of financial outcomes" />
                     {canDownload && (
                        <button 
                            onClick={() => downloadToExcel(
                                scope === 'ALL' ? schoolProfitabilityData : trendData, 
                                `Profitability_${scope}`
                            )}
                            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg border border-slate-200 transition-colors text-sm font-medium"
                        >
                            <Download size={16} /> Export
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left">{scope === 'ALL' ? 'School Branch' : 'Fiscal Year'}</th>
                                <th className="px-6 py-4 text-right">Total Revenue</th>
                                <th className="px-6 py-4 text-right">Total Expenses</th>
                                <th className="px-6 py-4 text-right">Net Surplus</th>
                                <th className="px-6 py-4 text-center">Margin %</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(scope === 'ALL' ? schoolProfitabilityData : [...trendData].sort((a,b) => b.year.localeCompare(a.year))).map((row, idx) => {
                                const rName = scope === 'ALL' ? row.name : row.year;
                                const rRev = scope === 'ALL' ? row.revenue : row.revenue;
                                const rExp = scope === 'ALL' ? row.expenses : row.expenses;
                                const rSurplus = scope === 'ALL' ? row.surplus : row.surplus;
                                const rMargin = rRev > 0 ? (rSurplus / rRev) * 100 : 0;
                                
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{rName}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(rRev)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-rose-500">{formatCurrency(rExp)}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${rSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(rSurplus)}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${rMargin >= 15 ? 'bg-emerald-100 text-emerald-700' : rMargin >= 0 ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {rMargin.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {rSurplus >= 0 ? (
                                                <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-bold uppercase tracking-wide">
                                                    <TrendingUp size={14} /> Profitable
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1 text-rose-600 text-xs font-bold uppercase tracking-wide">
                                                    <TrendingDown size={14} /> Deficit
                                                </div>
                                            )}
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
  };

  const renderDetailedReport = () => {
    const handleGenerate = async () => {
        setIsGeneratingReport(true);
        try {
            const report = await generateDetailedReport(scope, aggregates);
            setReportText(report);
        } catch (e) {
            setReportText("Report generation failed. Please check your API key.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-8">
                <SectionHeader title="Strategic Audit terminal" subtitle={`AI Intelligence Report for ${scope}`} />
                <button onClick={handleGenerate} disabled={isGeneratingReport} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-rose-700 transition-colors">
                    {isGeneratingReport ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Strategy Report
                </button>
            </div>
            {reportText ? (
                <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-200">
                    {reportText}
                </div>
            ) : (
                <div className="py-24 text-center text-slate-400">
                    <FileText size={64} className="mx-auto mb-4 opacity-20" />
                    <p>Click the button above to synthesize a boardroom-ready audit report.</p>
                </div>
            )}
        </div>
    );
  };

  const getModuleContent = () => {
    switch (module) {
        case AnalysisModule.Home: return renderHome();
        case AnalysisModule.Revenue: return renderRevenue();
        case AnalysisModule.Costs: return renderCosts();
        case AnalysisModule.Profitability: return renderProfitability();
        case AnalysisModule.DetailedReport: return renderDetailedReport();
        default: return <div className="text-center py-20 text-slate-400">Module content pending implementation for: {module}</div>;
    }
  };

  return <div className="space-y-6">{getModuleContent()}</div>;
};

export default Dashboard;
