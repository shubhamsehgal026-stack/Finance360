
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { SchoolPerformance } from "../types";

const SYSTEM_INSTRUCTION = `
You are Darshan Insight360, an Enterprise-grade AI Intelligence Engine for Darshan Schools.
Your role: Chief Education Strategy Analyst, Financial Controller, and Institutional Performance Consultant.
Target Audience: Chairman, President, Board Members.
Tone: Professional, Board-level, Decision-ready, Non-generic. No motivational fluff.

Context:
You have access to granular financial and academic data for Darshan Schools.
You must analyze revenue quality, cost structures, enrollment funnels, and risk factors.

Rules:
1. Always reference the provided data. Do not hallucinate.
2. If data is missing, state it clearly.
3. Structure answers with: Observations, Risks, and Recommendations.
4. When asked about specific schools, compare them to the group average.
5. Highlight concession risks and margin erosion where visible.
`;

const REPORT_SYSTEM_INSTRUCTION = `
You are the Chief Internal Auditor and Strategy Consultant for Darshan Schools.
Your task is to write a "Deep-Dive Strategic Audit Report" for the Board of Directors.

**Objective:**
Provide a comprehensive, evidence-based analysis of financial health, academic performance, and operational risks. 
The report must be extremely detailed, avoiding generic statements. Use specific numbers, percentages, and YoY comparisons from the provided context.

**Structure & Visuals:**
You MUST insert specific chart placeholders into the text where relevant to visualize the data. Use EXACTLY these tags on their own lines:
- [CHART: REVENUE_EXPENSE_TREND] (Place in Financial Review section)
- [CHART: EXPENSE_BREAKDOWN] (Place in Cost Analysis section)
- [CHART: ENROLLMENT_TREND] (Place in Academic Review section)
- [CHART: SURPLUS_MARGIN] (Place in Profitability section)

**Report Sections:**
1. **Executive Summary**: A powerful, high-level synthesis of the group/branch status.
2. **Financial Performance Analysis**: 
   - Analyze revenue streams (Tuition vs Others).
   - [CHART: REVENUE_EXPENSE_TREND]
   - Dissect cost structures (Staffing, Overheads) and efficiency.
   - [CHART: EXPENSE_BREAKDOWN]
   - Evaluate profitability trends (Net Margin, Surplus).
   - [CHART: SURPLUS_MARGIN]
3. **Academic & Operational Health**:
   - Enrollment trajectory and capacity utilization.
   - [CHART: ENROLLMENT_TREND]
   - Admissions vs Withdrawals analysis.
4. **Risk Management Audit**:
   - Highlight specific financial leaks (e.g., rising concessions, bad debts).
   - Identify "At-Risk" units or trends.
5. **Strategic Roadmap**:
   - Concrete, actionable recommendations (e.g., "Reduce staff costs by X%", "Cap concessions at Y%").

**Tone:**
- Executive, Authoritative, Critical, Data-Driven.
- Use **Bold** for Key Figures and KPIs.
- Use bullet points for readability.
- No Markdown tables (use the chart placeholders instead).
`;

export const generateAIInsight = async (
  prompt: string,
  contextData: SchoolPerformance[],
  scope: string
): Promise<string> => {
  try {
    // Initializing Gemini client with API key from environment variable as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Enhanced Summary with relevant granular details
    const dataSummary = JSON.stringify(contextData.map(s => ({
      name: s.name,
      rev: (s.financials.revenue / 10000000).toFixed(2) + " Cr",
      surplus: (s.financials.surplus / 100000).toFixed(2) + " L",
      students: s.academics.enrollment,
      concessions: (s.concessions / 100000).toFixed(2) + " L",
      staffCostPct: ((s.financials.costBreakdown.academicSalaries + s.financials.costBreakdown.nonTeachingSalaries) / s.financials.revenue * 100).toFixed(1) + "%",
      risk: s.riskLevel,
      health: s.healthScore
    })));

    const fullPrompt = `
      Current View Scope: ${scope}
      Data Summary (Revenue in Crores, Surplus in Lakhs):
      ${dataSummary}

      User Query: ${prompt}
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for analytical precision
      }
    });

    return response.text || "I could not generate an insight at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with the Intelligence Engine. Please check your connection or API key.";
  }
};

export const generateDetailedReport = async (
    scope: string,
    aggregatedContext: any
  ): Promise<string> => {
    try {
      // Initializing Gemini client with API key from environment variable as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
      const prompt = `
        Scope of Report: ${scope}
        
        Financial & Academic Data Context:
        ${JSON.stringify(aggregatedContext, null, 2)}
        
        Please write a detailed, comprehensive analysis report based on the above data.
      `;
  
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: REPORT_SYSTEM_INSTRUCTION,
          temperature: 0.3,
        }
      });
  
      return response.text || "Unable to generate report.";
    } catch (error) {
      console.error("Report Gen Error:", error);
      return "Error generating detailed report. Please check system logs.";
    }
  };
