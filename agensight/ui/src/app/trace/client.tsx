'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TraceDetailPage from '@/components/trace-detail-page';


export default function TraceClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();


  return (
        <TraceDetailPage id={id as string} router={router}/>
  );
} 