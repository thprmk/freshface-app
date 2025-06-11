// src/app/staffmanagement/target/page.tsx

import type { TargetPageData } from "@/app/api/types/target";
import TargetView from './TargetView'; // <-- IMPORTANT: Make sure you are importing TargetView

// Data fetching function (no changes here)
async function getTargetPageData(): Promise<TargetPageData | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/target`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// The main Server Component for the page
export default async function TargetPage() {
  const data = await getTargetPageData();

  if (!data) {
    return <div className="p-8 text-center text-red-500">Failed to load target data.</div>;
  }

  // This is the most important part.
  // The Server Component now just renders the Client Component and passes data to it.
  return <TargetView initialData={data} />;
}