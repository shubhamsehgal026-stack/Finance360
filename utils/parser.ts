
import { SchoolBranch, SchoolPerformance, ExpenseItem, ClassLevelData } from '../types';
import * as XLSX from 'xlsx';

const readExcelFile = (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 }) as any[][];
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

const normalizeYear = (yearStr: string): string => {
    const match = yearStr.match(/(\d{4})[-/](\d{2,4})/);
    if (match) {
        const start = match[1];
        let end = match[2];
        if (end.length === 4) end = end.substring(2);
        return `${start}-${end}`;
    }
    return yearStr;
};

export const cleanText = (text: any) => {
    let t = String(text || '').trim();
    t = t.replace(/^(To|By|to|by|Total|total)\s+/i, '').trim();
    t = t.replace(/^[\s\d.>-]+/, '').trim(); 
    return t;
};

export const parseAmount = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let cleaned = String(val).trim();
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) cleaned = '-' + cleaned.slice(1, -1);
    cleaned = cleaned.replace(/[₹$€£\s,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

export const parseTextToItems = (text: string) => {
    if (!text.trim()) return [];
    const lines = text.trim().split('\n');
    const items: { label: string, value: number, category: string }[] = [];
    let currentCategory = 'General';

    lines.forEach(line => {
        const row = line.trim();
        if (!row) return;

        let label = '';
        let amount: number | null = null;

        if (row.includes('\t')) {
            const parts = row.split('\t');
            label = cleanText(parts[0]);
            // Attempt to find the first valid number column
            for (let i = 1; i < parts.length; i++) {
                const raw = parts[i];
                // Check if it looks like a number (ignoring currency/commas) to distinguish from text
                const cleanedForCheck = String(raw).trim().replace(/[₹$€£\s,]/g, '');
                // Allow '-' as a valid value (0)
                if ((cleanedForCheck !== '' && !isNaN(parseFloat(cleanedForCheck))) || cleanedForCheck === '-') {
                    amount = parseAmount(raw);
                    break;
                }
            }
        } 
        else {
             // Handle cases where '-' represents 0 at the end of the line
            const hyphenMatch = row.match(/(.*?)\s+-\s*$/);
            
            if (hyphenMatch) {
                label = cleanText(hyphenMatch[1]);
                amount = 0;
            } else {
                const numberMatch = row.match(/(.*?)\s+([-]?[\d,.]+\.?\d*)$/);
                if (numberMatch) {
                    label = cleanText(numberMatch[1]);
                    amount = parseAmount(numberMatch[2]);
                } else {
                    label = cleanText(row);
                }
            }
        }

        if (label && amount === null && !/total|surplus|deficit|grand|net/i.test(label)) {
            currentCategory = label;
        } 
        else if (label && amount !== null) {
            items.push({ label, value: amount, category: currentCategory });
        }
    });
    return items;
};

export const parseSchoolData = async (
  school: SchoolBranch, 
  wing: string,
  year: string, 
  file: File,
  type: 'Finance' | 'Admission' = 'Finance'
): Promise<SchoolPerformance[]> => {
  const rows = await readExcelFile(file);
  const normYear = normalizeYear(year);
  if (type === 'Admission') return [processAdmissionData(school, wing, normYear, rows, file.name)];
  return [processFinanceData(school, wing, normYear, rows, file.name)];
};

const processAdmissionData = (school: SchoolBranch, wing: string, year: string, rows: any[][], fileName: string): SchoolPerformance => {
    const classMetrics: ClassLevelData[] = [];
    rows.forEach(row => {
        if(!row || row.length < 2) return;
        const key = cleanText(row[0]);
        // Explicitly check for valid value presence
        const rawVal = row[1];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
             const val = parseAmount(rawVal);
             if (!/class|grade|total/i.test(key)) {
                  classMetrics.push({ grade: key, enrollment: val, capacity: Math.ceil(val > 0 ? val * 1.2 : 40), revenue: 0, withdrawals: 0, admissions: 0 });
             }
        }
    });
    const totalEnrollment = classMetrics.reduce((sum, c) => sum + c.enrollment, 0);
    return {
        id: `AUDIT-${school}-${wing}-${year}-${Date.now()}`,
        timestamp: Date.now(),
        name: school,
        wing: wing,
        year: year,
        type: 'Admission',
        fileName: fileName,
        healthScore: 80,
        riskLevel: 'Low',
        trend: 'Stable',
        concessions: 0,
        monthlyCashFlow: [],
        academics: {
            enrollment: totalEnrollment,
            capacity: Math.round(totalEnrollment * 1.25),
            admissions: Math.round(totalEnrollment * 0.12),
            withdrawals: Math.round(totalEnrollment * 0.04),
            retentionRate: 96,
            classMetrics: classMetrics,
            enrollmentGrowth: 2.5,
            utilizationClassrooms: 85,
            utilizationLabs: 78
        },
        financials: generateEmptyFinancials()
    };
};

const processFinanceData = (school: SchoolBranch, wing: string, year: string, rows: any[][], fileName: string): SchoolPerformance => {
    let rev = 0, exp = 0;
    const heads: ExpenseItem[] = [];
    rows.forEach(row => {
        const k = cleanText(row[0]);
        const rawVal = row[1];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            const v = parseAmount(rawVal);
            
            // Accept 0 values, provided they have a label
            if (k) {
                if (/fee|receipt|income|revenue/i.test(k)) {
                    rev += v;
                    heads.push({ category: 'Revenue', subCategory: 'Uploaded Revenue', head: k, amount: v });
                }
                else {
                    exp += v;
                    heads.push({ category: 'Expenses', subCategory: 'General', head: k, amount: v });
                }
            }
        }
    });
    return mapFinanceData(school, wing, year, { rev, exp, surplus: rev - exp, assets: 0, capex: 0, cash: 0, receivables: 0, salary: 0, heads, revBreakdown: { tuition: rev, transport: 0, misc: 0 } }, fileName);
};

export const mapFinanceData = (school: SchoolBranch, wing: string, year: string, data: any, fileName: string): SchoolPerformance => {
    return {
        id: `AUDIT-${school}-${wing}-${year}-${Date.now()}`,
        timestamp: Date.now(),
        name: school,
        wing: wing,
        year: year,
        type: data.type || 'Finance',
        fileName: fileName,
        healthScore: data.rev > 0 ? (data.surplus > 0 ? 85 : 45) : 0,
        riskLevel: data.surplus < 0 ? 'High' : 'Low',
        trend: 'Stable',
        concessions: Math.round(data.rev * 0.05),
        monthlyCashFlow: generateFlatDistribution(data.rev || 0, data.exp || 0),
        academics: data.academics || { enrollment: 0, capacity: 0, admissions: 0, withdrawals: 0, retentionRate: 0, classMetrics: [], enrollmentGrowth: 0, utilizationClassrooms: 0, utilizationLabs: 0 },
        financials: {
            revenue: data.rev || 0,
            expenses: data.exp || 0,
            surplus: data.surplus || 0,
            cashFlow: data.surplus || 0,
            capEx: data.capex || 0,
            receivables: data.receivables || 0,
            revenueBreakdown: data.revBreakdown || { tuition: data.rev || 0, transport: 0, hostel: 0, activities: 0, miscellaneous: 0 },
            costBreakdown: { academicSalaries: data.salary || 0, nonTeachingSalaries: 0, adminOps: 0, infrastructure: 0, utilities: 0, transport: 0, marketing: 0, technology: 0, maintenance: 0, miscellaneous: Math.max(0, (data.exp || 0) - (data.salary || 0)) },
            detailedExpenses: data.heads || [],
            feeRealization: 92, badDebts: 2, recurringRevenue: 0, oneTimeRevenue: 0, revenueGrowth: 0, expenseGrowth: 0, fixedCosts: 0, variableCosts: 0, breakEvenStudents: 0,
            dropoutRevenueImpact: 0, grossSurplus: 0, operatingSurplus: (data.rev || 0) - (data.exp || 0), netSurplus: data.surplus || 0, grossMargin: 0, operatingMargin: 0, netMargin: 0, profitPerStudent: 0, cashBalance: 0, monthlyBurnRate: (data.exp || 0)/12, monthsOfRunway: 12, receivablesDays: 0, assetValue: data.assets || 0, liabilitiesValue: data.liabilities || 0, returnOnAssets: 0, maintenanceToAssetRatio: 0
        }
    };
};

const generateFlatDistribution = (totalRev: number, totalExp: number) => {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const monthlyIn = totalRev / 12;
  const monthlyOut = totalExp / 12;
  let cumulative = 0;
  return months.map((m) => {
    cumulative += (monthlyIn - monthlyOut);
    return { month: m, inflow: monthlyIn, outflow: monthlyOut, net: monthlyIn - monthlyOut, cumulative };
  });
};

export const parseStructuredFinanceData = async (
  school: SchoolBranch,
  wing: string,
  year: string,
  tables: { revenue: string[][], expense: string[][], assets: string[][], liabilities: string[][] }
): Promise<SchoolPerformance[]> => {
  let rev = 0;
  let exp = 0;
  const heads: ExpenseItem[] = [];
  
  tables.revenue.forEach(row => { if (row && row.length >= 2) rev += parseAmount(row[1]); });
  tables.expense.forEach(row => {
      if (row && row.length >= 2) {
          const rawVal = row[1];
          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
               const amt = parseAmount(rawVal);
               exp += amt;
               heads.push({ category: 'Direct Expense', subCategory: 'General', head: cleanText(row[0]), amount: amt });
          }
      }
  });
  const assetValue = tables.assets.reduce((sum, row) => sum + (row && row.length >= 2 ? parseAmount(row[1]) : 0), 0);
  const liabilitiesValue = tables.liabilities.reduce((sum, row) => sum + (row && row.length >= 2 ? parseAmount(row[1]) : 0), 0);
  const normYear = normalizeYear(year);
  return [mapFinanceData(school, wing, normYear, { rev, exp, surplus: rev - exp, assets: assetValue, liabilities: liabilitiesValue, heads, revBreakdown: { tuition: rev, transport: 0, misc: 0 } }, "Structured Import")];
};

export const parseStructuredAdmissionData = async (school: SchoolBranch, wing: string, year: string, gridData: string[][]): Promise<SchoolPerformance[]> => {
  const normYear = normalizeYear(year);
  return [processAdmissionData(school, wing, normYear, gridData, "Structured Admission Import")];
};

const generateEmptyFinancials = () => ({
    revenue: 0, expenses: 0, surplus: 0, cashFlow: 0, capEx: 0, receivables: 0,
    revenueBreakdown: { tuition: 0, transport: 0, hostel: 0, activities: 0, miscellaneous: 0 },
    costBreakdown: { academicSalaries: 0, nonTeachingSalaries: 0, adminOps: 0, infrastructure: 0, utilities: 0, transport: 0, marketing: 0, technology: 0, maintenance: 0, miscellaneous: 0 },
    detailedExpenses: [], feeRealization: 0, badDebts: 0, recurringRevenue: 0, oneTimeRevenue: 0, revenueGrowth: 0, expenseGrowth: 0, fixedCosts: 0, variableCosts: 0, breakEvenStudents: 0,
    dropoutRevenueImpact: 0, grossSurplus: 0, operatingSurplus: 0, netSurplus: 0, grossMargin: 0, operatingMargin: 0, netMargin: 0, profitPerStudent: 0, cashBalance: 0,
    monthlyBurnRate: 0, monthsOfRunway: 0, receivablesDays: 0, assetValue: 0, liabilitiesValue: 0, returnOnAssets: 0, maintenanceToAssetRatio: 0
});
