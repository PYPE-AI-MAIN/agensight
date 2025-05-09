import React from "react";
import TraceClient from "./client";

// Define the trace IDs to pre-render for static export
export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' }
  ];
}

export default function Page({ params }: { params: { id: string } }) {
  return <TraceClient id={params?.id} />;
}
