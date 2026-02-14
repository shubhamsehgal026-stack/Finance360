
export type UserRole = 'admin' | 'finance' | 'guest';

// Using a string type for flexibility with the new naming convention containing brackets
export type SchoolBranch = 
  | "Darshan Academy [Ambala]"
  | "Darshan Academy [Amritsar]"
  | "Darshan Academy [Bhubaneswar]"
  | "Darshan Academy [Dasuya]"
  | "Darshan Academy [Delhi]"
  | "Darshan Academy [Devlali]"
  | "Darshan Academy [Ferozepur]"
  | "Darshan Academy [Hisar]"
  | "Darshan Academy [Jagdishpura]"
  | "Darshan Academy [Jalandhar (Basti Nau)]"
  | "Darshan Academy [Jalandhar (Kala singha)]"
  | "Darshan Academy [Kaithal]"
  | "Darshan Academy [Kalka]"
  | "Darshan Academy [Lucknow]"
  | "Darshan Academy [Ludhiana]"
  | "Darshan Academy [Meerut]"
  | "Darshan Academy [Modasa]"
  | "Darshan Academy [Pune]"
  | "Darshan Academy [Rathonda]"
  | "Darshan Academy [Sundargarh]"
  | "Darshan Vidhayalaya [Gulleria Bhatt]"
  | "Darshan Vidhayalaya [Bigas]"
  | "Darshan Vidhayalaya [Jansath]"
  | "Darshan Academy [International]"
  | "Darshan Academy [Cali]";

export enum AnalysisModule {
  Home = "Home",
  DetailedReport = "Detailed Analysis Report",
  Revenue = "Revenue Analysis",
  Students = "Student Economics",
  Costs = "Costs & Expenses",
  Profitability = "Profitability",
  CashFlow = "Cash Flow & Liquidity",
  CapEx = "CapEx & Assets",
  Admissions = "Admissions & Enrollment",
  Withdrawals = "Withdrawals & Retention",
  Concessions = "Concessions Management",
  UnitEconomics = "Student Unit Economics",
  Scorecards = "Branch KPI Scorecards",
  GroupAnalysis = "Group Level Analysis",
  Benchmarking = "Benchmarking & Ranking"
}

export interface RevenueBreakdown {
  tuition: number;
  transport: number;
  hostel: number;
  activities: number;
  miscellaneous: number;
}

export interface CostBreakdown {
  academicSalaries: number;
  nonTeachingSalaries: number;
  adminOps: number;
  infrastructure: number;
  utilities: number;
  transport: number;
  marketing: number;
  technology: number;
  maintenance: number;
  miscellaneous: number;
}

export interface ExpenseItem {
  category: string; // Broad category (e.g., "Expenses")
  subCategory: string; // User-defined sub-category (e.g., "Academic Salaries")
  head: string; // Detailed description
  amount: number;
}

export interface ClassLevelData {
  grade: string;
  enrollment: number;
  capacity: number;
  revenue: number;
  withdrawals: number;
  admissions: number;
}

export interface FinancialData {
  revenue: number;
  expenses: number;
  surplus: number;
  cashFlow: number;
  capEx: number;
  receivables: number;
  revenueBreakdown: RevenueBreakdown;
  costBreakdown: CostBreakdown;
  detailedExpenses: ExpenseItem[]; 
  feeRealization: number; 
  badDebts: number; 
  recurringRevenue: number;
  oneTimeRevenue: number;
  revenueGrowth: number; 
  expenseGrowth: number; 
  fixedCosts: number;
  variableCosts: number;
  breakEvenStudents: number;
  dropoutRevenueImpact: number;
  grossSurplus: number;
  operatingSurplus: number;
  netSurplus: number;
  grossMargin: number; 
  operatingMargin: number; 
  netMargin: number; 
  profitPerStudent: number;
  cashBalance: number;
  monthlyBurnRate: number;
  monthsOfRunway: number;
  receivablesDays: number;
  assetValue: number;
  liabilitiesValue: number;
  returnOnAssets: number;
  maintenanceToAssetRatio: number;
}

export interface AcademicData {
  enrollment: number;
  admissions: number;
  withdrawals: number;
  capacity: number;
  retentionRate: number;
  classMetrics: ClassLevelData[];
  enrollmentGrowth: number; 
  utilizationClassrooms: number;
  utilizationLabs: number;
}

export interface SchoolPerformance {
  id: string;
  timestamp: number; // Used for version tracking
  year: string;
  name: SchoolBranch;
  wing: string; // "Main Wing", "Nur Wing", "Junior Wing", or "Holistic"
  type: 'Finance' | 'Admission'; 
  fileName?: string; 
  financials: FinancialData;
  academics: AcademicData;
  healthScore: number; 
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  trend: 'Up' | 'Down' | 'Stable';
  concessions: number; 
  monthlyCashFlow: { month: string; inflow: number; outflow: number; net: number; cumulative: number }[];
}

export interface DashboardState {
  selectedModule: AnalysisModule;
  selectedSchool: SchoolBranch | 'ALL';
  data: SchoolPerformance[];
  isLoading: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
