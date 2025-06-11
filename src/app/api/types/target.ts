// src/app/api/types/target.ts

// This interface represents the metrics for Target, Achieved, etc.
export interface SummaryMetrics {
  service: number;
  retail: number;
  netSales: number;
  bills: number;

  // Note: The API data has `abv` as a number, but the component formats it as currency.
  // The underlying type should remain a number.
  abv: number;
  callbacks: number;
  appointmentsFromCallbacks: number;
}

// This extends SummaryMetrics with percentage values for the "Heading To" row.
export interface HeadingToMetrics extends SummaryMetrics {
  serviceInPercentage: number;
  retailInPercentage: number;
  netSalesInPercentage: number;
  billsInPercentage: number;
  abvInPercentage: number;
  callbacksInPercentage: number;
  appointmentsInPercentage: number;
}

// This groups the three rows of the summary table.
export interface SummaryData {
  target: SummaryMetrics;
  achieved: SummaryMetrics;
  headingTo: HeadingToMetrics;
}

// This defines the structure for a single row in the daily breakdown.
// *** KEY FIX: 'date' is defined as a string to match component expectations. ***
export interface DailyRecord {
  date: string; // Was number in your data, but string is expected by the component.
  day: string;
  netSalesAchieved: number;
  achievePercentage: number;
  bills: number;
  abvAchieved: number;
  callbacksDone: number;
  appointmentsFromCallbacks: number;
  // Note: The API can have extra fields; they will be ignored if not defined here.
}

// This is the main data structure for the entire page.
export interface TargetPageData {
  summary: SummaryData;
  dailyRecords: DailyRecord[];
}