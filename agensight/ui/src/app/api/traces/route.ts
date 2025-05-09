import { NextResponse } from "next/server";
import { TraceItem } from "@/hooks/use-trace-column";

// For static export, using force-static to ensure this data is available at build time
export const dynamic = "force-static";
export const revalidate = 31536000; // 1 year in seconds

const mockTraces: TraceItem[] = [
  {
    id: 1,
    name: "Process Customer Request",
    session_id: "sess_aB3cD8eF9gH0iJ1",
    started_at: "2023-10-10T09:32:15Z",
    ended_at: "2023-10-10T09:33:45Z",
    metadata: JSON.stringify({
      user_id: "usr_123456",
      request_type: "customer_support",
      priority: "high"
    })
  },
  {
    id: 2,
    name: "User Authentication Flow",
    session_id: "sess_kL2mN3oP4qR5sT6",
    started_at: "2023-10-11T14:21:08Z",
    ended_at: "2023-10-11T14:21:58Z",
    metadata: JSON.stringify({
      user_id: "usr_789012",
      auth_method: "2fa",
      device: "mobile"
    })
  },
  {
    id: 3,
    name: "Data Processing Pipeline",
    session_id: "sess_uV7wX8yZ9aB0cD1",
    started_at: "2023-10-12T03:45:22Z",
    ended_at: "2023-10-12T04:12:17Z",
    metadata: JSON.stringify({
      dataset_id: "ds_456789",
      records_processed: 157842,
      errors: 12
    })
  },
  {
    id: 4,
    name: "Customer Onboarding",
    session_id: "sess_eF2gH3iJ4kL5mN6",
    started_at: "2023-10-13T11:07:33Z",
    ended_at: "2023-10-13T11:18:42Z",
    metadata: JSON.stringify({
      customer_id: "cus_345678",
      plan: "premium",
      referral_source: "partner"
    })
  },
  {
    id: 5,
    name: "Payment Processing",
    session_id: "sess_oP7qR8sT9uV0wX1",
    started_at: "2023-10-14T16:55:10Z",
    ended_at: "2023-10-14T16:55:48Z",
    metadata: JSON.stringify({
      payment_id: "pay_678901",
      amount: 129.99,
      currency: "USD",
      method: "credit_card"
    })
  },
  {
    id: 6,
    name: "Process Customer Request",
    session_id: "sess_aB3cD8eF9gH0iJ1",
    started_at: "2023-10-10T09:32:15Z",
    ended_at: "2023-10-10T09:33:45Z",
    metadata: JSON.stringify({
      user_id: "usr_123456",
      request_type: "customer_support",
      priority: "high"
    })
  },
  {
    id: 7,
    name: "User Authentication Flow",
    session_id: "sess_kL2mN3oP4qR5sT6",
    started_at: "2023-10-11T14:21:08Z",
    ended_at: "2023-10-11T14:21:58Z",
    metadata: JSON.stringify({
      user_id: "usr_789012",
      auth_method: "2fa",
      device: "mobile"
    })
  },
  {
    id: 8,
    name: "Data Processing Pipeline",
    session_id: "sess_uV7wX8yZ9aB0cD1",
    started_at: "2023-10-12T03:45:22Z",
    ended_at: "2023-10-12T04:12:17Z",
    metadata: JSON.stringify({
      dataset_id: "ds_456789",
      records_processed: 157842,
      errors: 12
    })
  },
  {
    id: 9,
    name: "Customer Onboarding",
    session_id: "sess_eF2gH3iJ4kL5mN6",
    started_at: "2023-10-13T11:07:33Z",
    ended_at: "2023-10-13T11:18:42Z",
    metadata: JSON.stringify({
      customer_id: "cus_345678",
      plan: "premium",
      referral_source: "partner"
    })
  },
  {
    id: 10,
    name: "Payment Processing",
    session_id: "sess_oP7qR8sT9uV0wX1",
    started_at: "2023-10-14T16:55:10Z",
    ended_at: "2023-10-14T16:55:48Z",
    metadata: JSON.stringify({
      payment_id: "pay_678901",
      amount: 129.99,
      currency: "USD",
      method: "credit_card"
    })
  }
];

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 500));
  return NextResponse.json(mockTraces);
}
