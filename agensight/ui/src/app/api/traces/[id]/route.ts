import { NextRequest, NextResponse } from "next/server";
import { TraceItem } from "@/hooks/use-trace-column";

// For static export, using force-static to ensure this data is available at build time
export const dynamic = "force-static";
export const revalidate = 31536000; // 1 year in seconds

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' }
  ];
}

// Mock data for a single trace
const mockTraceData: Record<string, TraceItem> = {
  "1": {
    id: 1,
    name: "Process Customer Request",
    session_id: "sess_aB3cD8eF9gH0iJ1",
    started_at: "2023-10-10T09:32:15Z",
    ended_at: "2023-10-10T09:33:45Z",
    metadata: JSON.stringify({
      user_id: "usr_123456",
      request_type: "customer_support",
      priority: "high",
      tags: ["billing", "subscription"],
      steps_completed: 7,
      total_steps: 7,
      status: "completed"
    }, null, 2)
  },
  "2": {
    id: 2,
    name: "User Authentication Flow",
    session_id: "sess_kL2mN3oP4qR5sT6",
    started_at: "2023-10-11T14:21:08Z",
    ended_at: "2023-10-11T14:21:58Z",
    metadata: JSON.stringify({
      user_id: "usr_789012",
      auth_method: "2fa",
      device: "mobile",
      location: "US-West",
      success: true,
      attempts: 1
    }, null, 2)
  },
  "3": {
    id: 3,
    name: "Data Processing Pipeline",
    session_id: "sess_uV7wX8yZ9aB0cD1",
    started_at: "2023-10-12T03:45:22Z",
    ended_at: "2023-10-12T04:12:17Z",
    metadata: JSON.stringify({
      dataset_id: "ds_456789",
      records_processed: 157842,
      errors: 12,
      warning_count: 87,
      processing_time_ms: 1615000,
      output_format: "parquet"
    }, null, 2)
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if trace exists
  if (id in mockTraceData) {
    return NextResponse.json(mockTraceData[id]);
  }
  
  return new NextResponse(
    JSON.stringify({ error: "Trace not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
} 