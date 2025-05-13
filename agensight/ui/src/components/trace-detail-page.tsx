"use client";

import React, { useEffect, useState, useMemo } from "react";
import { TraceItem, schema } from "@/hooks/use-trace-column";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconClock, IconCode, IconMessageCircle, IconUser, IconRobot, IconChevronRight, IconFile, IconList, IconMessageDots, IconBrandTabler, IconSettings } from "@tabler/icons-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTraceById, getSpanDetailsById } from "@/lib/services/traces";
import { useQuery } from "@tanstack/react-query";

// Define types locally for the span data
interface ToolCall {
  args: Record<string, string>;
  duration: number;
  name: string;
  output: string;
  span_id: string;
}

interface Prompt {
  content: string;
  id: number;
  message_index: number;
  role: string;
  span_id: string;
}

interface Completion {
  completion_tokens: number;
  content: string;
  finish_reason: string;
  id: number;
  prompt_tokens: number;
  role: string;
  span_id: string;
  total_tokens: number;
}

interface SpanDetails {
  span_id: string;
  prompts: Prompt[];
  completions: Completion[];
  tools: ToolCall[];
}

interface Span {
  duration: number;
  end_time: number;
  final_completion: string;
  name: string;
  span_id: string;
  start_time: number;
  tools_called: ToolCall[];
  details?: SpanDetails; // Optional details that will be loaded when a span is selected
}

interface TraceDetailPageProps {
  id: string;
  router: AppRouterInstance;
}

// GanttChart component
interface GanttChartProps {
  spans: Span[];
  trace: TraceItem | null;
}

// GanttChartVisualizer component - only handles the visual representation
interface GanttChartVisualizerProps {
  spans: Span[];
  trace: TraceItem | null;
  onSelectSpan: (span: Span) => void;
  onSelectTool: (tool: ToolCall) => void;
  selectedSpanId?: string;
}

// Add a custom hook to prevent scroll propagation
function usePreventScrollPropagation() {
  useEffect(() => {
    const preventPropagation = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const scrollContainer = target.closest('.scroll-container');
      
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight;
        
        // Check if scroll is at the boundaries to decide if we should prevent propagation
        if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
          e.preventDefault();
        }
        
        e.stopPropagation();
      }
    };
    
    document.addEventListener('wheel', preventPropagation, { passive: false });
    return () => document.removeEventListener('wheel', preventPropagation);
  }, []);
}

function GanttChart({ spans, trace }: GanttChartProps) {
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [selectedGanttSpan, setSelectedGanttSpan] = useState<Span | null>(null);
  const [focusedSpanIndex, setFocusedSpanIndex] = useState<number>(-1);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!spans.length) return;
      
      const allSpans = [...spans];
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedSpanIndex(prev => {
            const newIndex = prev <= 0 ? allSpans.length - 1 : prev - 1;
            return newIndex;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedSpanIndex(prev => {
            const newIndex = prev >= allSpans.length - 1 ? 0 : prev + 1;
            return newIndex;
          });
          break;
        case 'Enter':
          if (focusedSpanIndex >= 0 && focusedSpanIndex < allSpans.length) {
            setSelectedGanttSpan(allSpans[focusedSpanIndex]);
            setSelectedTool(null);
          }
          break;
        case 'Escape':
          setSelectedTool(null);
          setSelectedGanttSpan(null);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spans, focusedSpanIndex]);
  
  // Generate processed timeline data
  const timelineData = useMemo(() => {
    if (!spans.length || !trace) return null;
    
    // Find the earliest start time and latest end time
    const startTime = Math.min(...spans.map(span => span.start_time));
    const endTime = Math.max(...spans.map(span => span.end_time));
    
    // Calculate total duration for scaling
    const totalDuration = endTime - startTime;
    
    // Generate time marks (5 evenly spaced time points)
    const timeMarks = [];
    for (let i = 0; i <= 5; i++) {
      const time = startTime + (i * totalDuration / 5);
      timeMarks.push(new Date(time * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }
    
    // Create a mapping of types to colors
    const typeColors: Record<string, string> = {
      "User": "#4f86f7", // Blue
      "Assistant": "#4ae0a0", // Green
      "flight-search": "#ffa559", // Orange
      "hotel-recommendation": "#ff5995", // Pink
      "database-lookup": "#9370db", // Purple 
      "gpt-4o-mini": "#66cdaa", // Medium aquamarine
      "get_weather": "#ffd700", // Gold
      "get_news": "#ff6b6b", // Light red
      "router": "#8a2be2", // Blue violet
      "default": "#a9a9a9" // Gray for unknown types
    };
    
    return {
      startTime,
      endTime,
      totalDuration,
      timeMarks,
      typeColors
    };
  }, [spans, trace]);
  
  // If no data, show loading or empty state
  if (!timelineData) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No timeline data available</p>
      </div>
    );
  }
  
  // Map spans by actor (categorized as user or agent)
  const userSpans = spans.filter(span => span.name.toLowerCase().includes("user") || span.name.toLowerCase().includes("input"));
  const agentSpans = spans.filter(span => !userSpans.includes(span));
  
  return (
    <div className="flex flex-col">
      {/* Chart section */}
      <div className="mb-2">
        {/* Time axis */}
        <div className="flex justify-between mb-1 text-xs text-muted-foreground sticky top-0 bg-background z-10 pb-0.5" suppressHydrationWarning>
          {timelineData.timeMarks.map((mark, i) => (
            <div key={i} suppressHydrationWarning>{mark}</div>
          ))}
        </div>
        
        {/* Chart container - increasing height from h-60 to h-80 */}
        <div className="h-80 relative border rounded-md overflow-hidden">
          {/* Scrollable content area */}
          <div className="overflow-y-auto h-full">
            {/* Grid lines and spans container */}
            <div className="relative min-h-full">
              {/* Vertical grid lines */}
              {timelineData.timeMarks.map((_, i) => (
                <div 
                  key={i} 
                  className="absolute top-0 bottom-0 border-r border-dashed border-muted-foreground/20" 
                  style={{ left: `${(i / 5) * 100}%` }}
                />
              ))}
              
              {/* Rows for user spans */}
              {userSpans.map((span, i) => {
                const isUserFocused = focusedSpanIndex === spans.indexOf(span);
                return (
                  <div 
                    key={`user-${span.span_id}`} 
                    className={`flex items-center ${isUserFocused ? 'bg-muted/30 -mx-4 px-4' : ''} mb-0.5`}
                    tabIndex={0}
                    onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                  >
                    <div className="w-32 text-right pr-3 text-sm">user</div>
                    <div className="flex-1 relative h-5">
                      <div 
                        className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isUserFocused ? 'ring-2 ring-primary' : ''}`}
                        style={{
                          backgroundColor: timelineData.typeColors["User"] || timelineData.typeColors.default,
                          left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                          width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                          minWidth: "8px",
                          zIndex: 10
                        }}
                        title={`${span.name}: ${span.duration.toFixed(2)}s`}
                        onClick={() => {
                          setSelectedGanttSpan(span);
                          setSelectedTool(null);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Rows for agent spans */}
              <div className="mt-5 space-y-0">
              {agentSpans.map((span, i) => {
                const isAgentFocused = focusedSpanIndex === spans.indexOf(span);
                  
                return (
                  <div 
                    key={`agent-${span.span_id}`} 
                      className={`flex items-center ${isAgentFocused ? 'bg-muted/30 -mx-4 px-4' : ''} h-5 my-0 py-0 mb-3 ${i < agentSpans.length - 1 ? 'border-b border-dotted border-muted-foreground/20 pb-3' : ''}`}
                    tabIndex={0}
                    onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                  >
                      <div className="w-32 text-right pr-3 text-sm truncate">
                        {span.name}
                      </div>
                      <div className="flex-1 relative h-5">
                      {/* For each agent span */}
                      <div 
                          className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isAgentFocused ? 'ring-2 ring-primary' : ''}`}
                        style={{
                          backgroundColor: timelineData.typeColors[span.name] || timelineData.typeColors["Assistant"] || timelineData.typeColors.default,
                          left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                          width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                          minWidth: "8px",
                          zIndex: 10
                        }}
                        title={`${span.name}: ${span.duration.toFixed(2)}s`}
                        onClick={() => {
                          setSelectedGanttSpan(span);
                          setSelectedTool(null);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend section */}
      <div className="flex flex-wrap gap-3 py-2 text-xs border-t border-b mb-3">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors["User"] }}></span>
          <span className="text-xs">User</span>
        </div>
        
        <div className="border-l h-4 mx-2 border-muted-foreground/30"></div>
        
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors["Assistant"] }}></span>
          <span className="text-xs">Assistant</span>
        </div>
        
        {/* Show span types in the legend */}
        {agentSpans.map(span => (
          span.name !== "Assistant" && 
          <div key={`legend-${span.name}`} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors[span.name] || timelineData.typeColors.default }}></span>
            <span className="text-xs">{span.name}</span>
          </div>
        ))}
      </div>
      
      {/* Details section */}
      {selectedTool && (
        <div className="border rounded-md p-3 bg-card max-h-[400px] overflow-y-auto scroll-container">
          <div className="flex justify-between items-center mb-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 mr-1 text-xs flex items-center gap-1"
                  onClick={() => setSelectedTool(null)}
                >
                  <IconArrowLeft size={12} />
                  <span>Back</span>
                </Button>
            <h4 className="font-medium">{selectedTool.name}</h4>
              </div>
              {selectedGanttSpan && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span>From:</span>
                  <strong>{selectedGanttSpan.name}</strong>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedTool(null)} className="h-6 w-6 p-0">
              ×
            </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Duration: {selectedTool.duration.toFixed(2)}s
          </div>
          <div className="mb-2">
            <h5 className="text-xs font-medium text-muted-foreground mb-1">Arguments:</h5>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
              {JSON.stringify(selectedTool.args, null, 2)}
            </pre>
          </div>
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
              {selectedTool.output}
            </pre>
          </div>
          {selectedGanttSpan && selectedGanttSpan.tools_called && selectedGanttSpan.tools_called.length > 1 && (
            <div className="mt-4 pt-3 border-t">
              <h5 className="text-xs font-medium text-muted-foreground mb-2">Other Tools Used by {selectedGanttSpan.name}:</h5>
              <div className="space-y-1">
                {selectedGanttSpan.tools_called
                  .filter(tool => tool.span_id !== selectedTool.span_id)
                  .map((tool, i) => (
                    <div 
                      key={i} 
                      className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTool(tool);
                      }}
                    >
                      <span>{tool.name}</span>
                      <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
      
      {selectedGanttSpan && !selectedTool && (
        <div className="border rounded-md p-3 bg-card">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">{selectedGanttSpan.name}</h4>
            <Button size="sm" variant="ghost" onClick={() => setSelectedGanttSpan(null)} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            Duration: {selectedGanttSpan.duration.toFixed(2)}s
          </div>
          
          <div className="text-xs mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">Start:</span>
              <span suppressHydrationWarning>{new Date(selectedGanttSpan.start_time * 1000).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End:</span>
              <span suppressHydrationWarning>{new Date(selectedGanttSpan.end_time * 1000).toLocaleTimeString()}</span>
            </div>
          </div>
          
          {selectedGanttSpan.tools_called.length > 0 && (
            <div>
              <h5 className="text-xs font-medium mb-2">Tools Used:</h5>
              <div className="space-y-1">
                {selectedGanttSpan.tools_called.map((tool, i) => (
                  <div 
                    key={i} 
                    className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTool(tool);
                    }}
                  >
                    <span>{tool.name}</span>
                    <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GanttChartVisualizer({ spans, trace, onSelectSpan, onSelectTool, selectedSpanId }: GanttChartVisualizerProps) {
  const [focusedSpanIndex, setFocusedSpanIndex] = useState<number>(-1);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!spans.length) return;
      
      const allSpans = [...spans];
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedSpanIndex(prev => {
            const newIndex = prev <= 0 ? allSpans.length - 1 : prev - 1;
            return newIndex;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedSpanIndex(prev => {
            const newIndex = prev >= allSpans.length - 1 ? 0 : prev + 1;
            return newIndex;
          });
          break;
        case 'Enter':
          if (focusedSpanIndex >= 0 && focusedSpanIndex < allSpans.length) {
            onSelectSpan(allSpans[focusedSpanIndex]);
          }
          break;
        case 'Escape':
          // Clear selection (handled by parent)
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spans, focusedSpanIndex, onSelectSpan]);
  
  // Generate processed timeline data
  const timelineData = useMemo(() => {
    if (!spans.length || !trace) return null;
    
    // Find the earliest start time and latest end time
    const startTime = Math.min(...spans.map(span => span.start_time));
    const endTime = Math.max(...spans.map(span => span.end_time));
    
    // Calculate total duration for scaling
    const totalDuration = endTime - startTime;
    
    // Generate time marks (5 evenly spaced time points)
    const timeMarks = [];
    for (let i = 0; i <= 5; i++) {
      const time = startTime + (i * totalDuration / 5);
      timeMarks.push(new Date(time * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }
    
    // Create a mapping of types to colors
    const typeColors: Record<string, string> = {
      "User": "#4f86f7", // Blue
      "Assistant": "#4ae0a0", // Green
      "flight-search": "#ffa559", // Orange
      "hotel-recommendation": "#ff5995", // Pink
      "database-lookup": "#9370db", // Purple 
      "gpt-4o-mini": "#66cdaa", // Medium aquamarine
      "get_weather": "#ffd700", // Gold
      "get_news": "#ff6b6b", // Light red
      "router": "#8a2be2", // Blue violet
      "default": "#a9a9a9" // Gray for unknown types
    };
    
    return {
      startTime,
      endTime,
      totalDuration,
      timeMarks,
      typeColors
    };
  }, [spans, trace]);
  
  // If no data, show loading or empty state
  if (!timelineData) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No timeline data available</p>
      </div>
    );
  }
  
  // Map spans by actor (categorized as user or agent)
  const userSpans = spans.filter(span => span.name.toLowerCase().includes("user") || span.name.toLowerCase().includes("input"));
  const agentSpans = spans.filter(span => !userSpans.includes(span));
  
  return (
    <div className="h-full flex flex-col">
      {/* Time axis */}
      <div className="flex justify-between mb-1 text-xs text-muted-foreground sticky top-0 bg-background z-10 pb-0.5" suppressHydrationWarning>
        {timelineData.timeMarks.map((mark, i) => (
          <div key={i} suppressHydrationWarning>{mark}</div>
        ))}
      </div>
      
      {/* Chart container */}
      <div className="flex-1 relative">
        {/* Scrollable content area */}
        <div className="h-full overflow-y-auto">
          {/* Grid lines and spans container */}
          <div className="relative min-h-full">
            {/* Vertical grid lines */}
            {timelineData.timeMarks.map((_, i) => (
              <div 
                key={i} 
                className="absolute top-0 bottom-0 border-r border-dashed border-muted-foreground/20" 
                style={{ left: `${(i / 5) * 100}%` }}
              />
            ))}
            
            {/* Rows for user spans */}
            {userSpans.map((span, i) => {
              const isUserFocused = focusedSpanIndex === spans.indexOf(span);
              const isSelected = selectedSpanId === span.span_id;
              
              return (
                <div 
                  key={`user-${span.span_id}`} 
                  className={`flex items-center ${isUserFocused ? 'bg-muted/30 -mx-4 px-4' : ''} mb-0.5`}
                  tabIndex={0}
                  onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                >
                  <div className="w-32 text-right pr-3 text-sm">user</div>
                  <div className="flex-1 relative h-5">
                    <div 
                      className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      style={{
                        backgroundColor: timelineData.typeColors["User"] || timelineData.typeColors.default,
                        left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                        width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                        minWidth: "8px",
                        zIndex: 10
                      }}
                      title={`${span.name}: ${span.duration.toFixed(2)}s`}
                      onClick={() => onSelectSpan(span)}
                    />
                  </div>
                </div>
              );
            })}
            
            {/* Rows for agent spans */}
            <div className="mt-5 space-y-0">
            {agentSpans.map((span, i) => {
              const isAgentFocused = focusedSpanIndex === spans.indexOf(span);
              const isSelected = selectedSpanId === span.span_id;
              
              return (
                <div 
                  key={`agent-${span.span_id}`} 
                    className={`flex items-center ${isAgentFocused ? 'bg-muted/30 -mx-4 px-4' : ''} h-5 my-0 py-0 mb-3 ${i < agentSpans.length - 1 ? 'border-b border-dotted border-muted-foreground/20 pb-3' : ''}`}
                  tabIndex={0}
                  onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                >
                  <div className="w-32 text-right pr-3 text-sm truncate">{span.name}</div>
                    <div className="flex-1 relative h-5">
                    {/* For each agent span */}
                    <div 
                        className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      style={{
                        backgroundColor: timelineData.typeColors[span.name] || timelineData.typeColors["Assistant"] || timelineData.typeColors.default,
                        left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                        width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                        minWidth: "8px",
                        zIndex: 10
                      }}
                      title={`${span.name}: ${span.duration.toFixed(2)}s`}
                      onClick={() => onSelectSpan(span)}
                    />
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-3 py-2 text-xs border-t">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors["User"] }}></span>
          <span className="text-xs">User</span>
        </div>
        
        <div className="border-l h-4 mx-2 border-muted-foreground/30"></div>
        
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors["Assistant"] }}></span>
          <span className="text-xs">Assistant</span>
        </div>
        
        {/* Show span types in the legend */}
        {agentSpans.map(span => (
          span.name !== "Assistant" && 
          <div key={`legend-${span.name}`} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors[span.name] || timelineData.typeColors.default }}></span>
            <span className="text-xs">{span.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceDetailPage({ id, router }: TraceDetailPageProps) {
  const [activeTab, setActiveTab] = useState("trace-details");
  const [trace, setTrace] = useState<TraceItem | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spanDetailsLoading, setSpanDetailsLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [selectedGanttSpan, setSelectedGanttSpan] = useState<Span | null>(null);

  // Use React Query for the trace data
  const { 
    data: traceData,
    isLoading 
  } = useQuery({
    queryKey: ['trace', id],
    queryFn: () => getTraceById(id)
  });
  

  // Process trace data when it changes
  useEffect(() => {
    if (traceData) {
      try {
        // Our new format doesn't match the schema, so we'll handle it directly
        console.log("Received trace data:", traceData);
        
        // Create a minimal trace object with the fields we have
        setTrace({
          id: traceData.id || "unknown",
          name: "Trace Details",
          session_id: "session",
          started_at: (traceData.agents?.[0]?.start_time || Date.now() / 1000).toString(),
          ended_at: (traceData.agents?.[traceData.agents.length - 1]?.end_time || Date.now() / 1000).toString(),
          trace_input: traceData.trace_input,
          trace_output: traceData.trace_output,
          metadata: {
            trace_id: traceData.trace_id
          }
        });
        
        // Set spans from the agents data
        if (traceData.agents && Array.isArray(traceData.agents)) {
          setSpans(traceData.agents);
        
          // Set the first span as selected by default if available
          if (traceData.agents.length > 0) {
            setSelectedSpan(traceData.agents[0]);
          }
        }
      } catch (err) {
        console.error("Error processing trace data:", err);
        setError(err instanceof Error ? err.message : "Failed to process trace data");
      }
    }
  }, [traceData]);
  
  // Handle errors in trace fetch
  useEffect(() => {
    if (isLoading) {
      setError(null);
    }
  }, [isLoading]);
  
  // Use React Query for span details
  const { 
    data: spanData,
    isLoading: isSpanLoading 
  } = useQuery({
    queryKey: ['span', selectedSpan?.span_id],
    queryFn: () => selectedSpan?.span_id ? getSpanDetailsById(selectedSpan.span_id) : null,
    enabled: !!selectedSpan?.span_id && !selectedSpan?.details
  });
  
  // Process span details when they change
  useEffect(() => {
    if (spanData) {
      updateSpanWithDetails(spanData);
    }
  }, [spanData]);
  
  // Update spanDetailsLoading based on isSpanLoading
  useEffect(() => {
    setSpanDetailsLoading(isSpanLoading);
  }, [isSpanLoading]);
  
  // Helper function to update span with details
  function updateSpanWithDetails(details: SpanDetails) {
    // Update the selected span with the details
    setSelectedSpan(prevSpan => {
      if (!prevSpan) return null;
      return {
        ...prevSpan,
        details
      };
    });
    
    // Also update the span in the spans array
    setSpans(prevSpans => 
      prevSpans.map(span => 
        // Make sure we're checking against a valid span ID
        (selectedSpan && span.span_id === selectedSpan.span_id)
          ? { ...span, details } 
          : span
      )
    );
  }

  // Add the hook to prevent scroll propagation
  usePreventScrollPropagation();
  
  // Add a useEffect to ensure scrollable containers work properly
  useEffect(() => {
    // Find all scroll containers and ensure they have proper overflow behavior
    const scrollContainers = document.querySelectorAll('.scroll-container');
    scrollContainers.forEach(container => {
      // Force a small scroll to activate scrolling
      if (container instanceof HTMLElement) {
        container.scrollTop = 1;
        container.scrollTop = 0;
      }
    });
    
    // Also initialize all pre element containers
    const preContainers = document.querySelectorAll('pre');
    preContainers.forEach(pre => {
      const parent = pre.parentElement;
      if (parent && parent.classList.contains('overflow-y-auto')) {
        parent.scrollTop = 1;
        parent.scrollTop = 0;
      }
    });
  }, [selectedSpan, activeTab]);

  const backButton = (
    <Button 
      variant="ghost" 
      size="sm" 
      className="flex items-center gap-1 mr-4" 
      onClick={(e) => {
        e.preventDefault();
        // Store the current tab selection in session storage
        // This will be read by the dashboard page component to set active tab
        sessionStorage.setItem('dashboardActiveTab', 'traces');
        // Navigate to the dashboard page
        router.push("/dashboard");
      }}
    >
      <IconArrowLeft size={16} />
      <span>Back</span>
    </Button>
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const formatDuration = (duration: number) => {
    return `${duration.toFixed(2)}s`;
  };

  return (
    <div className="max-h-screen flex flex-col overflow-hidden animate-fadeIn">
      {/* Main content takes full height */}
      <main className="flex flex-col overflow-hidden h-full">
        <div className="flex items-center justify-between text-sm px-6 py-2 border-b bg-muted/20 flex-shrink-0 sticky top-0 z-20">
          {backButton}
          { trace && (
            <div className="flex items-center flex-wrap gap-2 py-2">
              <Badge variant="outline" className="text-xs">
                ID: {trace.id}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Session: {trace.session_id}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Name: {trace.name}
              </Badge>
              <Badge variant="outline" className="text-xs" suppressHydrationWarning>
                Latency: {((new Date(trace.ended_at).getTime() - new Date(trace.started_at).getTime()) / 1000).toFixed(2)}s
              </Badge>
            </div>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex-1 overflow-auto">
            <TraceDetailSkeleton />
          </div>
        ) : error ? (
          <div className="flex-1 overflow-auto p-6">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{error}</p>
              </CardContent>
            </Card>
          </div>
        ) : trace ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="flex-1 flex gap-0 flex-col overflow-hidden"
            >
              <div className="border-b bg-muted/20 px-6 w-full flex-shrink-0 sticky top-0 z-10">
                <TabsList className="h-10 w-auto bg-transparent gap-6 border-0">
                  <TabsTrigger 
                    value="trace-details" 
                    className="relative h-10 px-2 rounded-none bg-transparent border-0 data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <IconFile size={18} />
                      <span>Details</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="span-details" 
                    className="relative h-10 px-2 rounded-none bg-transparent border-0 data-[state=active]:text-primary data-[state=active]:font-medium data-[state=active]:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <IconList size={18} />
                      <span>Span Details</span>
                      <Badge className="ml-1 h-5 bg-primary/10 text-primary hover:bg-primary/10">
                        {spans.length}
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent 
                  value="trace-details" 
                  className="flex-1 p-0 m-0 data-[state=active]:flex h-full overflow-hidden"
                >
                  <div className="flex w-full h-full overflow-hidden">
                    <div className="w-3/5 border-r overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
                      {/* Fixed header sections */}
                      <div className="flex-shrink-0 border-b">
                        <div className="bg-card z-20 pt-4 px-4 border-b pb-2">
                          <h2 className="text-base font-semibold flex items-center">
                            <IconMessageCircle size={16} className="mr-2 text-muted-foreground" />
                            Input
                          </h2>
                        </div>
                      </div>
                      
                      {/* Scrollable content area */}
                      <div className="flex-1 overflow-y-auto">
                        {/* Input content */}
                        <div className="p-4 pb-6">
                          <Card className="overflow-hidden border border-border">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                                <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                                  <IconUser size={14} />
                                </div>
                                <span className="text-sm font-medium">User</span>
                              </div>
                              <div className="whitespace-pre-wrap pl-8 text-sm">
                                {trace.trace_input}
                              </div>
                            </CardContent>
                          </Card>
                      </div>

                      {/* Output Section */}
                        <div className="border-t">
                          <div className="flex-shrink-0 bg-card z-10 pt-4 px-4 border-b pb-2">
                          <h2 className="text-base font-semibold flex items-center">
                            <IconMessageDots size={16} className="mr-2 text-muted-foreground" />
                            Output
                          </h2>
                        </div>
                        <div className="p-4 pb-8">
                          <Card className="overflow-hidden border border-border">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                  <IconRobot size={14} />
                                </div>
                                <span className="text-sm font-medium">Assistant</span>
                              </div>
                              <div className="whitespace-pre-wrap pl-8 text-sm">
                                {trace.trace_output}
                              </div>
                            </CardContent>
                          </Card>
                          </div>
                        </div>
                      </div>
                    </div>
                      
                    {/* Right panel - Gantt chart */}
                    <div className="w-2/5 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
                      {/* Fixed header */}
                      <div className="flex-shrink-0 p-4 pb-2">
                        <h2 className="text-base font-semibold mb-2">Timeline</h2>
                      </div>
                      
                      {/* Scrollable content */}
                      <div className="flex-1 overflow-y-auto px-4">
                        <div className="flex flex-col">
                          {/* Chart container */}
                          <div className="border rounded-md p-3 overflow-hidden" style={{ height: '320px' }}>
                            <div className="h-full overflow-y-auto">
                              <GanttChartVisualizer 
                                spans={spans} 
                                trace={trace} 
                                onSelectSpan={(span) => setSelectedGanttSpan(span)}
                                onSelectTool={(tool) => setSelectedTool(tool)}
                                selectedSpanId={selectedGanttSpan?.span_id}
                              />
                            </div>
                          </div>
                          
                          {/* Details panel */}
                          {selectedTool && (
                            <div className="mt-4 border rounded-md p-3 bg-card max-h-[400px] overflow-y-auto scroll-container">
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 px-2 mr-1 text-xs flex items-center gap-1"
                                      onClick={() => setSelectedTool(null)}
                                    >
                                      <IconArrowLeft size={12} />
                                      <span>Back</span>
                                    </Button>
                                <h4 className="font-medium">{selectedTool.name}</h4>
                                  </div>
                                  {selectedGanttSpan && (
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <span>From:</span>
                                      <strong>{selectedGanttSpan.name}</strong>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setSelectedTool(null)} className="h-6 w-6 p-0">
                                  ×
                                </Button>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                Duration: {selectedTool.duration.toFixed(2)}s
                              </div>
                              <div className="mb-2">
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Arguments:</h5>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
                                  {JSON.stringify(selectedTool.args, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
                                  {selectedTool.output}
                                </pre>
                              </div>
                              {selectedGanttSpan && selectedGanttSpan.tools_called && selectedGanttSpan.tools_called.length > 1 && (
                                <div className="mt-4 pt-3 border-t">
                                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Other Tools Used by {selectedGanttSpan.name}:</h5>
                                  <div className="space-y-1">
                                    {selectedGanttSpan.tools_called
                                      .filter(tool => tool.span_id !== selectedTool.span_id)
                                      .map((tool, i) => (
                                        <div 
                                          key={i} 
                                          className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTool(tool);
                                          }}
                                        >
                                          <span>{tool.name}</span>
                                          <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {selectedGanttSpan && !selectedTool && (
                            <div className="mt-4 border rounded-md p-3 bg-card">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{selectedGanttSpan.name}</h4>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedGanttSpan(null)} className="h-6 w-6 p-0">
                                  ×
                                </Button>
                              </div>
                              
                              <div className="text-xs text-muted-foreground mb-2">
                                Duration: {selectedGanttSpan.duration.toFixed(2)}s
                              </div>
                              
                              <div className="text-xs mb-2">
                                <div className="flex justify-between mb-1">
                                  <span className="text-muted-foreground">Start:</span>
                                  <span suppressHydrationWarning>{new Date(selectedGanttSpan.start_time * 1000).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">End:</span>
                                  <span suppressHydrationWarning>{new Date(selectedGanttSpan.end_time * 1000).toLocaleTimeString()}</span>
                                </div>
                              </div>
                              
                              {selectedGanttSpan.tools_called.length > 0 && (
                                <div>
                                  <h5 className="text-xs font-medium mb-2">Tools Used:</h5>
                                  <div className="space-y-1">
                                    {selectedGanttSpan.tools_called.map((tool, i) => (
                                      <div 
                                        key={i} 
                                        className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTool(tool);
                                        }}
                                      >
                                        <span>{tool.name}</span>
                                        <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Span Details Tab */}
                <TabsContent 
                  value="span-details" 
                  className="flex-1 p-0 m-0 data-[state=active]:flex h-full overflow-hidden"
                >
                  <div className="flex w-full h-full overflow-hidden">
                    {/* Left Panel - Spans List */}
                    <div className="w-60 border-r overflow-hidden flex flex-col flex-shrink-0" style={{ height: 'calc(100vh - 110px)' }}>
                      {/* Fixed header */}
                      <div className="p-4 border-b flex-shrink-0">
                        <h3 className="text-base font-semibold mb-1">Agents & Spans</h3>
                        <p className="text-xs text-muted-foreground">
                          {spans.length} span{spans.length !== 1 ? 's' : ''} in this trace
                        </p>
                      </div>
                      {/* Scrollable area */}
                      <div className="overflow-y-auto flex-1 scroll-container">
                        {/* Group spans by agent name */}
                        {Object.entries(
                          spans.reduce((acc, span) => {
                            const agentName = span.name.includes("Agent") || span.name.includes("Planner") || 
                                            span.name.includes("Processor") || span.name.includes("Analyzer") || 
                                            span.name.includes("Presenter") || span.name.includes("Generator") 
                                            ? span.name : "Other";
                            acc[agentName] = acc[agentName] || [];
                            acc[agentName].push(span);
                            return acc;
                          }, {} as Record<string, Span[]>)
                        ).map(([agentName, agentSpans]) => (
                          <div key={agentName} className="mb-2">
                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                              {agentName}
                            </div>
                            {agentSpans.map((span) => (
                          <div 
                            key={span.span_id}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              selectedSpan?.span_id === span.span_id 
                                ? 'bg-primary/5 border-l-4 border-l-primary' 
                                : 'hover:bg-muted/30 border-l-4 border-l-transparent'
                            }`}
                            onClick={() => setSelectedSpan(span)}
                          >
                            <div className="font-medium">{span.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <IconClock size={14} />
                                  <span suppressHydrationWarning>{formatDuration(span.duration)}</span>
                            </div>
                            {span.tools_called.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    <IconCode size={12} />
                                    <span>{span.tools_called.length} tool{span.tools_called.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                              </div>
                            ))}
                          </div>
                        ))}
                        {spans.length === 0 && (
                          <div className="py-4 text-center text-muted-foreground">
                            No spans available for this trace
                          </div>
                        )}
                      </div>
                    </div>
                  
                    {/* Right Panel - Span Details */}
                    <div className="flex-1 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 110px)' }}>
                      {selectedSpan ? (
                        <div className="h-full flex flex-col overflow-hidden">
                          <div className="p-4 flex-shrink-0 border-b">
                            <h2 className="text-xl font-semibold">{selectedSpan.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                Duration: {formatDuration(selectedSpan.duration)}
                              </Badge>
                              <Badge variant="outline">
                                ID: {selectedSpan.span_id}
                              </Badge>
                              <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/15">
                                Agent
                              </Badge>
                            </div>
                            <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                              <IconClock size={16} />
                              <span>
                                Start: <span suppressHydrationWarning>{formatTime(selectedSpan.start_time)}</span>
                              </span>
                              <span className="mx-2">•</span>
                              <span>
                                End: <span suppressHydrationWarning>{formatTime(selectedSpan.end_time)}</span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 overflow-hidden">
                            <Tabs defaultValue="completion" className="h-full flex flex-col overflow-hidden">
                              <TabsList className="bg-transparent border-b w-full px-4 rounded-none h-10 justify-start gap-4 flex-shrink-0">
                                <TabsTrigger 
                                  value="completion" 
                                  className="text-base bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-medium rounded-none border-0 relative h-10"
                                >
                                  <span>Span</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                                <TabsTrigger 
                                  value="tools" 
                                  className="text-base bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-medium rounded-none border-0 relative h-10"
                                >
                                  <span>Tool Calls</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                                <TabsTrigger 
                                  value="agent" 
                                  className="text-base bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-medium rounded-none border-0 relative h-10"
                                >
                                  <span>Agent Info</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                              </TabsList>
                              
                              {/* Tab Content Container - This is where we need to fix scrolling */}
                              <div className="flex-1 overflow-hidden">
                                <TabsContent value="completion" className="h-full p-0 m-0 data-[state=active]:block overflow-scroll text-white flex flex-col">
                                  <div className="flex-1 overflow-hidden flex flex-col">
                                    <div className="px-4 py-4 flex-1 overflow-y-auto scroll-container">
                                      {spanDetailsLoading ? (
                                        <div className="flex items-center justify-center h-32">
                                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                                        </div>
                                      ) : selectedSpan?.details ? (
                                        <div className="space-y-6">
                                          {/* Input/Prompt section */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                      <IconMessageCircle size={16} />
                                              <h3 className="text-base text-white font-medium">Input</h3>
                                    </div>
                                            {selectedSpan.details.prompts.length > 0 ? (
                                              <div className="space-y-4">
                                                {selectedSpan.details.prompts.map((prompt, index) => (
                                                  <div key={index} className="border rounded-md">
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                                                      <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                                                        <IconUser size={14} />
                                    </div>
                                                      <span className="text-sm font-medium">User</span>
                                                    </div>
                                                    <div className="border-t">
                                                      <div>
                                                        <div className="h-[300px] w-full">
                                                          <iframe
                                                            srcDoc={`
                                                              <!DOCTYPE html>
                                                              <html>
                                                                <head>
                                                                  <style>
                                                                    body {
                                                                      margin: 0;
                                                                      padding: 12px;
                                                                      font-family: monospace;
                                                                      font-size: 12px;
                                                                      white-space: pre-wrap;
                                                                      overflow-y: auto;
                                                                      height: 100vh;
                                                                      color:white;
                                                                      box-sizing: border-box;
                                                                    }
                                                                  </style>
                                                                </head>
                                                                <body>${prompt.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                              </html>
                                                            `}
                                                            style={{width: "100%", height: "100%", border: "none"}}
                                                            title="Prompt content"
                                                          />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-muted-foreground">No input data available.</p>
                                            )}
                                          </div>
                                          
                                          {/* Output/Completion section */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                              <IconMessageDots size={16} />
                                              <h3 className="text-base font-medium">Output</h3>
                                            </div>
                                            {selectedSpan.details.completions.length > 0 ? (
                                              <div className="space-y-4">
                                                {selectedSpan.details.completions.map((completion, index) => (
                                                  <div key={index} className="border rounded-md">
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                                                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <IconRobot size={14} />
                                                      </div>
                                                      <span className="text-sm font-medium">Assistant</span>
                                                      <span className="text-xs text-muted-foreground ml-auto">
                                                        {completion.total_tokens} tokens
                                                      </span>
                                                    </div>
                                                    <div className="border-t">
                                                      <div>
                                                        <div className="h-[300px] w-full">
                                                          <iframe
                                                            srcDoc={`
                                                              <!DOCTYPE html>
                                                              <html>
                                                                <head>
                                                                  <style>
                                                                    body {
                                                                      margin: 0;
                                                                      padding: 12px;
                                                                      font-family: monospace;
                                                                      font-size: 12px;
                                                                      white-space: pre-wrap;
                                                                      overflow-y: auto;
                                                                      height: 100vh;
                                                                      box-sizing: border-box;
                                                                      color:white;
                                                                    }
                                                                  </style>
                                                                </head>
                                                                <body>${completion.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                              </html>
                                                            `}
                                                            style={{width: "100%", height: "100%", border: "none"}}
                                                            title="Completion content"
                                                          />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-muted-foreground">No output data available.</p>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                            <IconMessageCircle size={16} />
                                            <h3 className="text-base font-medium">Final Completion</h3>
                                          </div>
                                          <div className="border rounded-md">
                                            <div className="border-t">
                                              <div>
                                                <div className="h-[300px] w-full">
                                                  <iframe
                                                    srcDoc={`
                                                      <!DOCTYPE html>
                                                      <html>
                                                        <head>
                                                          <style>
                                                            body {
                                                              margin: 0;
                                                              padding: 12px;
                                                              font-family: monospace;
                                                              font-size: 12px;
                                                              white-space: pre-wrap;
                                                              overflow-y: auto;
                                                              height: 100vh;
                                                              box-sizing: border-box;
                                                              background-color: #f1f5f9;
                                                            }
                                                            @media (prefers-color-scheme: dark) {
                                                              body {
                                                                background-color: #1e293b;
                                                                color: #f8fafc;
                                                              }
                                                            }
                                                          </style>
                                                        </head>
                                                        <body>${(selectedSpan?.final_completion || "No completion data available.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                                                      </html>
                                                    `}
                                                    style={{width: "100%", height: "100%", border: "none"}}
                                                    title="Final completion content"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                              </TabsContent>
                              
                                <TabsContent value="tools" className="h-full p-0 m-0 data-[state=active]:block overflow-hidden">
                                  <div className="h-full overflow-hidden">
                                    <div className="px-4 py-4 h-full overflow-y-auto scroll-container">
                                      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                        <IconCode size={16} />
                                        <h3 className="text-base font-medium">Tools Called</h3>
                                      </div>
                                    {selectedSpan.tools_called.length === 0 ? (
                                      <p className="text-muted-foreground">No tools were called in this span.</p>
                                    ) : (
                                      <div className="space-y-4">
                                        {selectedSpan.tools_called.map((tool: ToolCall, index: number) => (
                                          <div key={index} className="border rounded-md p-4 border-border">
                                            <div className="font-medium">{tool.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                              Duration: {formatDuration(tool.duration)}
                                            </div>
                                            
                                            <div className="mt-3">
                                              <div className="text-xs font-medium text-muted-foreground mb-1">Arguments:</div>
                                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto w-full max-h-32 scroll-container">
                                                {JSON.stringify(tool.args, null, 2)}
                                              </pre>
                                            </div>
                                            
                                            <div className="mt-3">
                                              <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto w-full max-h-32 scroll-container">
                                                {tool.output}
                                              </pre>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    </div>
                                  </div>
                              </TabsContent>
                              
                                <TabsContent value="agent" className="h-full p-0 m-0 data-[state=active]:block overflow-hidden">
                                  <div className="h-full overflow-hidden">
                                    <div className="px-4 py-4 h-full overflow-y-auto scroll-container">
                                      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                                        <IconRobot size={16} />
                                        <h3 className="text-base font-medium">Agent Information</h3>
                                      </div>
                                      
                                      <div className="space-y-6">
                                        <div>
                                          <h4 className="text-sm font-medium mb-2">Agent</h4>
                                          <div className="p-3 bg-muted rounded-md">
                                            <div className="font-medium">{selectedSpan.name}</div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                              Span ID: {selectedSpan.span_id}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h4 className="text-sm font-medium mb-2">Tools Used</h4>
                                          {selectedSpan.tools_called.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No tools were used by this agent.</p>
                                          ) : (
                                            <div className="space-y-2">
                                              {selectedSpan.tools_called.map((tool, index) => (
                                                <div key={index} className="p-2 bg-muted/60 rounded-md">
                                                  <div className="font-medium">{tool.name}</div>
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    Duration: {formatDuration(tool.duration)}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div>
                                          <h4 className="text-sm font-medium mb-2">Execution Time</h4>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-muted rounded-md">
                                              <div className="text-xs text-muted-foreground mb-1">Start Time</div>
                                              <div className="text-sm" suppressHydrationWarning>
                                                {formatTime(selectedSpan.start_time)}
                                              </div>
                                            </div>
                                            <div className="p-3 bg-muted rounded-md">
                                              <div className="text-xs text-muted-foreground mb-1">End Time</div>
                                              <div className="text-sm" suppressHydrationWarning>
                                                {formatTime(selectedSpan.end_time)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h4 className="text-sm font-medium mb-2">Related Agents</h4>
                                          {spans.filter(span => span.span_id !== selectedSpan.span_id).length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No other agents in this trace.</p>
                                          ) : (
                                            <div className="space-y-2">
                                              {spans
                                                .filter(span => span.span_id !== selectedSpan.span_id)
                                                .map((span) => {
                                                  // Determine relationship based on timing
                                                  let relationship = "Parallel";
                                                  if (span.end_time <= selectedSpan.start_time) {
                                                    relationship = "Preceding";
                                                  } else if (span.start_time >= selectedSpan.end_time) {
                                                    relationship = "Following";
                                                  }
                                                  
                                                  return (
                                                    <div 
                                                      key={span.span_id} 
                                                      className="p-2 bg-muted/60 rounded-md flex justify-between items-center cursor-pointer hover:bg-muted"
                                                      onClick={() => setSelectedSpan(span)}
                                                    >
                                                      <div>
                                                        <div className="font-medium">{span.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                          Duration: {formatDuration(span.duration)}
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <Badge 
                                                          variant={
                                                            relationship === "Preceding" ? "outline" : 
                                                            relationship === "Following" ? "secondary" : 
                                                            "default"
                                                          }
                                                          className={
                                                            relationship === "Preceding" ? "text-blue-500 bg-blue-500/10" : 
                                                            relationship === "Following" ? "text-green-500 bg-green-500/10" : 
                                                            "text-amber-500 bg-amber-500/10"
                                                          }
                                                        >
                                                          {relationship}
                                                        </Badge>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                              </TabsContent>
                              </div>
                            </Tabs>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center p-8">
                            <IconArrowLeft size={48} className="text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-medium mb-2">Select a span</h3>
                            <p className="text-muted-foreground">
                              Choose a span from the list to view its details
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-hidden">
            <Card>
              <CardHeader>
                <CardTitle>Trace Not Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p>The requested trace could not be found.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function TraceDetailSkeleton() {
  return (
    <div className="flex w-full h-full">
      {/* Left panel skeleton */}
      <div className="w-3/5 border-r overflow-hidden">
        <div className="border-b bg-card/50 pt-4 px-4 pb-2">
          <Skeleton className="h-6 w-40 mb-2" />
        </div>
        <div className="p-4">
          <Card className="overflow-hidden border border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="pl-8 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="border-t bg-card/50 pt-4 px-4 pb-2 mt-4">
          <Skeleton className="h-6 w-40 mb-2" />
        </div>
        <div className="p-4">
          <Card className="overflow-hidden border border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2 border-b pb-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="pl-8 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Right panel skeleton */}
      <div className="w-2/5 p-4">
        <div className="flex flex-col">
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="border rounded-md p-4" style={{ height: '450px' }}>
            {/* Timeline axis skeleton */}
            <div className="flex justify-between mb-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-10" />
              ))}
            </div>
            
            {/* Gantt chart skeleton - use fixed values instead of random */}
            <div className="flex-1">
              <div className="flex items-center mb-4">
                  <Skeleton className="w-32 h-4 mr-3" />
                  <div className="flex-1 relative h-6">
                    <Skeleton 
                      className="absolute h-full rounded-sm" 
                    style={{ left: "10%", width: "40%" }}
                    />
                  </div>
                </div>
              <div className="flex items-center mb-4">
                <Skeleton className="w-32 h-4 mr-3" />
                <div className="flex-1 relative h-6">
                  <Skeleton 
                    className="absolute h-full rounded-sm" 
                    style={{ left: "15%", width: "55%" }}
                  />
                </div>
              </div>
              <div className="flex items-center mb-4">
                <Skeleton className="w-32 h-4 mr-3" />
                <div className="flex-1 relative h-6">
                  <Skeleton 
                    className="absolute h-full rounded-sm" 
                    style={{ left: "25%", width: "30%" }}
                  />
                </div>
              </div>
              <div className="flex items-center mb-4">
                <Skeleton className="w-32 h-4 mr-3" />
                <div className="flex-1 relative h-6">
                  <Skeleton 
                    className="absolute h-full rounded-sm" 
                    style={{ left: "5%", width: "70%" }}
                  />
                </div>
              </div>
              <div className="flex items-center mb-4">
                <Skeleton className="w-32 h-4 mr-3" />
                <div className="flex-1 relative h-6">
                  <Skeleton 
                    className="absolute h-full rounded-sm" 
                    style={{ left: "20%", width: "45%" }}
                  />
                </div>
              </div>
            </div>
            
            {/* Legend skeleton */}
            <div className="mt-2 pt-2 border-t flex flex-wrap gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TraceDetailPage; 