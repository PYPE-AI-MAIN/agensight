"use client";

import { useRouter } from "next/navigation";
import TraceDetailPage from "@/components/trace-detail-page";

interface ClientProps {
  id: string;
}

export default function TraceClient({ id }: ClientProps) {
  const router = useRouter();

  return (
    <TraceDetailPage id={id} router={router} />
  );
} 