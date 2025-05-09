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

// Define types locally for the span data
interface ToolCall {
  args: Record<string, string>;
  duration: number;
  name: string;
  output: string;
  span_id: string;
}

interface Span {
  duration: number;
  end_time: number;
  final_completion: string;
  name: string;
  span_id: string;
  start_time: number;
  tools_called: ToolCall[];
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

// Mock span data for testing until the API is fully implemented
const mockSpans: Span[] = [
  {
    duration: 8.16,
    end_time: 1746727872.69,
    final_completion: "As of now, the weather in Bangalore is sunny with a temperature of 25°C.\n\nAs for the latest AI news, I can provide some general updates. Would you like to hear about any specific developments or advancements in the field of artificial intelligence?",
    name: "Planner",
    span_id: "8f4dfbea3ed048d3",
    start_time: 1746727864.53,
    tools_called: [
      {
        args: {
          location: "Bangalore"
        },
        duration: 7.34,
        name: "get_weather",
        output: "{\"location\": \"Bangalore\"}",
        span_id: "b8e52c49f98389b1"
      },
      {
        args: {
          topic: "AI"
        },
        duration: 7.34,
        name: "get_news",
        output: "{\"topic\": \"AI\"}",
        span_id: "b8e52c49f98389b1"
      }
    ]
  },
  {
    duration: 1.17,
    end_time: 1746727873.86,
    final_completion: "Schedule:\n\n10:00 am - 11:30 am: Outdoor yoga session at the park\n12:00 pm - 1:00 pm: Lunch at a rooftop restaurant\n2:00 pm - 4:00 pm: Visit the botanical gardens\n4:30 pm - 6:00 pm: Explore the local market\n7:00 pm - 8:00 pm: Dinner at an outdoor restaurant\n\nAs for the latest AI news, I can provide some general updates. Would you like to hear about any specific developments or advancements in the field of artificial intelligence?",
    name: "Scheduler",
    span_id: "f239d3d2a0c652e0",
    start_time: 1746727872.69,
    tools_called: []
  },
  {
    duration: 3.09,
    end_time: 1746727876.95,
    final_completion: "Join us for a day of relaxation and exploration with our carefully curated schedule:\n\n10:00 am - 11:30 am: Start the day with an invigorating outdoor yoga session at the park to rejuvenate your mind and body.\n\n12:00 pm - 1:00 pm: Indulge in a delicious lunch at a rooftop restaurant with stunning views of the city.\n\n2:00 pm - 4:00 pm: Immerse yourself in the beauty of nature with a visit to the botanical gardens, where you can admire a diverse array of plants and flowers.\n\n4:30 pm - 6:00 pm: Discover the vibrant local culture at the bustling market, where you can browse through unique products and immerse yourself in the lively atmosphere.\n\n7:00 pm - 8:00 pm: End the day with a delightful dinner at an outdoor restaurant, enjoying the evening breeze and delectable cuisine.\n\nAs for the latest AI news, I can provide some general updates. Would you like to hear about any specific developments or advancements in the field of artificial intelligence?",
    name: "Presenter",
    span_id: "74a786be29319f04",
    start_time: 1746727873.86,
    tools_called: []
  }
];

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
  
  // Get unique tool types for the legend
  const toolTypes = new Set<string>();
  spans.forEach(span => {
    span.tools_called.forEach(tool => {
      toolTypes.add(tool.name);
    });
  });
  
  return (
    <div className="flex flex-col">
      {/* Chart section */}
      <div className="mb-2">
        {/* Time axis */}
        <div className="flex justify-between mb-2 text-xs text-muted-foreground sticky top-0 bg-background z-10 pb-1" suppressHydrationWarning>
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
                    className={`flex items-center ${isUserFocused ? 'bg-muted/30 -mx-4 px-4' : ''}`}
                    tabIndex={0}
                    onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                  >
                    <div className="w-32 text-right pr-3 text-sm">user</div>
                    <div className="flex-1 relative h-6">
                      <div 
                        className={`absolute h-full rounded-sm hover:h-8 hover:-top-1 transition-all duration-75 cursor-pointer ${isUserFocused ? 'ring-2 ring-primary' : ''}`}
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
              {agentSpans.map((span, i) => {
                const isAgentFocused = focusedSpanIndex === spans.indexOf(span);
                return (
                  <div 
                    key={`agent-${span.span_id}`} 
                    className={`flex items-center ${isAgentFocused ? 'bg-muted/30 -mx-4 px-4' : ''}`}
                    tabIndex={0}
                    onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                  >
                    <div className="w-32 text-right pr-3 text-sm truncate">{span.name}</div>
                    <div className="flex-1 relative h-6">
                      {/* For each agent span */}
                      <div 
                        className={`absolute h-full rounded-sm hover:h-8 hover:-top-1 transition-all duration-75 cursor-pointer ${isAgentFocused ? 'ring-2 ring-primary' : ''}`}
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
                      
                      {/* For each tool call within agent span - improving positioning and z-index to avoid overlap */}
                      {span.tools_called.map((tool, toolIndex) => {
                        // Calculate a better positioning for tools to avoid overlap
                        const toolStart = span.start_time + (span.duration * toolIndex / Math.max(1, span.tools_called.length));
                        const toolWidth = Math.min(tool.duration, span.duration / Math.max(1, span.tools_called.length) * 0.95);
                        
                        return (
                          <div 
                            key={`tool-${span.span_id}-${toolIndex}`}
                            className={`absolute h-full rounded-sm hover:h-8 hover:-top-1 transition-all duration-75 cursor-pointer`}
                            style={{
                              backgroundColor: timelineData.typeColors[tool.name] || timelineData.typeColors.default,
                              left: `${((toolStart - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                              width: `${(toolWidth / timelineData.totalDuration) * 100}%`,
                              minWidth: "8px",
                              zIndex: 20
                            }}
                            title={`Tool: ${tool.name} (${tool.duration.toFixed(2)}s)`}
                            onClick={(e) => {
                              e.stopPropagation(); // Stop event from bubbling up to span
                              setSelectedTool(tool);
                              setSelectedGanttSpan(null); // Clear span selection when tool is selected
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
        
        <div className="border-l h-4 mx-2 border-muted-foreground/30"></div>
        
        {/* Show unique tool types in the legend */}
        {Array.from(toolTypes).map(toolType => (
          <div key={toolType} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors[toolType] || timelineData.typeColors.default }}></span>
            <span className="text-xs">{toolType}</span>
          </div>
        ))}
      </div>
      
      {/* Details section */}
      {selectedTool && (
        <div className="border rounded-md p-3 bg-card">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">{selectedTool.name}</h4>
            <Button size="sm" variant="ghost" onClick={() => setSelectedTool(null)} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Duration: {selectedTool.duration.toFixed(2)}s
          </div>
          <div className="mb-2">
            <h5 className="text-xs font-medium text-muted-foreground mb-1">Arguments:</h5>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
              {JSON.stringify(selectedTool.args, null, 2)}
            </pre>
          </div>
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
              {selectedTool.output}
            </pre>
          </div>
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
  
  // Get unique tool types for the legend
  const toolTypes = new Set<string>();
  spans.forEach(span => {
    span.tools_called.forEach(tool => {
      toolTypes.add(tool.name);
    });
  });
  
  return (
    <div className="h-full flex flex-col">
      {/* Time axis */}
      <div className="flex justify-between mb-2 text-xs text-muted-foreground sticky top-0 bg-background z-10 pb-1" suppressHydrationWarning>
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
                  className={`flex items-center ${isUserFocused ? 'bg-muted/30 -mx-4 px-4' : ''}`}
                  tabIndex={0}
                  onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                >
                  <div className="w-32 text-right pr-3 text-sm">user</div>
                  <div className="flex-1 relative h-6">
                    <div 
                      className={`absolute h-full rounded-sm hover:h-8 hover:-top-1 transition-all duration-75 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
            {agentSpans.map((span, i) => {
              const isAgentFocused = focusedSpanIndex === spans.indexOf(span);
              const isSelected = selectedSpanId === span.span_id;
              
              return (
                <div 
                  key={`agent-${span.span_id}`} 
                  className={`flex items-center ${isAgentFocused ? 'bg-muted/30 -mx-4 px-4' : ''}`}
                  tabIndex={0}
                  onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                >
                  <div className="w-32 text-right pr-3 text-sm truncate">{span.name}</div>
                  <div className="flex-1 relative h-6">
                    {/* For each agent span */}
                    <div 
                      className={`absolute h-full rounded-sm hover:h-8 hover:-top-1 transition-all duration-75 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
                    
                    {/* For each tool call within agent span - improve positioning and z-index */}
                    {span.tools_called.map((tool, toolIndex) => {
                      // Calculate a better positioning for tools to avoid overlap
                      const toolStart = span.start_time + (span.duration * toolIndex / Math.max(1, span.tools_called.length));
                      const toolWidth = Math.min(tool.duration, span.duration / Math.max(1, span.tools_called.length) * 0.95);
                        
                      return (
                        <div 
                          key={`tool-${span.span_id}-${toolIndex}`}
                          className={`absolute h-full rounded-sm hover:h-8 hover:-top-1 transition-all duration-75 cursor-pointer`}
                          style={{
                            backgroundColor: timelineData.typeColors[tool.name] || timelineData.typeColors.default,
                            left: `${((toolStart - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                            width: `${(toolWidth / timelineData.totalDuration) * 100}%`,
                            minWidth: "8px",
                            zIndex: 20
                          }}
                          title={`Tool: ${tool.name} (${tool.duration.toFixed(2)}s)`}
                          onClick={(e) => {
                            e.stopPropagation(); // Stop event from bubbling up to span
                            onSelectTool(tool);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
        
        <div className="border-l h-4 mx-2 border-muted-foreground/30"></div>
        
        {/* Show unique tool types in the legend */}
        {Array.from(toolTypes).map(toolType => (
          <div key={toolType} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.typeColors[toolType] || timelineData.typeColors.default }}></span>
            <span className="text-xs">{toolType}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceDetailPage({ id, router }: TraceDetailPageProps) {
  const [trace, setTrace] = useState<TraceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [activeTab, setActiveTab] = useState<string>("trace-details");
  const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
  const [selectedGanttSpan, setSelectedGanttSpan] = useState<Span | null>(null);

  useEffect(() => {
    async function fetchTraceData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/traces/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch trace: ${response.statusText}`);
        }
        
        const data = await response.json();
        const validatedData = schema.parse(data);
        setTrace(validatedData);
        
        // Use mockSpans for now - in production this would come from the API
        setSpans(mockSpans);
        
        // Set the first span as selected by default if available
        if (mockSpans.length > 0) {
          setSelectedSpan(mockSpans[0]);
        }
      } catch (err) {
        console.error("Error fetching trace:", err);
        setError(err instanceof Error ? err.message : "Failed to load trace data");
      } finally {
        setLoading(false);
      }
    }

    fetchTraceData();
  }, [id]);

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
        <div className="flex items-center justify-between text-sm px-6 py-2 border-b bg-muted/20 flex-shrink-0">
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
              <Badge variant="outline" className="text-xs">
                Latency: {((new Date(trace.ended_at).getTime() - new Date(trace.started_at).getTime()) / 1000).toFixed(2)}s
              </Badge>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex-1 overflow-hidden">
            <TraceDetailSkeleton />
          </div>
        ) : error ? (
          <div className="flex-1 p-6 overflow-hidden">
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
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="border-b bg-muted/20 px-6 w-full flex-shrink-0">
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
                  className="flex-1 p-0 m-0 data-[state=active]:flex h-full"
                >
                  <div className="flex w-full h-full">
                    <div className="w-3/5 border-r overflow-y-auto" style={{ height: 'calc(100vh - 110px)' }}>
                      {/* Input Section */}
                      <div className="border-b bg-card/50">
                        <div className="sticky top-0 bg-card z-20 pt-4 px-4 border-b pb-2">
                          <h2 className="text-base font-semibold flex items-center">
                            <IconMessageCircle size={16} className="mr-2 text-muted-foreground" />
                            Input
                          </h2>
                        </div>
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
                                I need information about the weather in New York and the latest news about technology.
                                Also, can you help me plan a day trip to the city?
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Output Section */}
                      <div className="bg-card/50">
                        <div className="sticky top-0 bg-card z-10 pt-4 px-4 border-b pb-2">
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
                                Today in New York, it's 68°F and partly cloudy with a 20% chance of rain in the afternoon.
                                
                                For the latest tech news, Apple just announced their new iPhone 15 with improved camera capabilities and longer battery life. Microsoft released a major Windows update with new AI features, and Tesla unveiled plans for a more affordable electric vehicle.
                                
                                Here's a suggested day trip itinerary for New York City:
                                
                                9:00 AM - Start with breakfast at a local cafe in Greenwich Village
                                10:30 AM - Visit the Metropolitan Museum of Art
                                1:00 PM - Grab lunch at Chelsea Market
                                2:30 PM - Take a walk on the High Line
                                4:00 PM - Visit the One World Observatory for panoramic views
                                6:00 PM - Dinner in Little Italy
                                8:00 PM - Catch a Broadway show (if available)
                                
                                Would you like me to recommend specific restaurants or exhibits at the museum?
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                      
                    {/* Right panel - Gantt chart */}
                    <div className="w-2/5 overflow-y-auto" style={{ height: 'calc(100vh - 110px)', maxHeight: 'calc(100vh - 110px)' }}>
                      <div className="p-4">
                        <div className="flex flex-col">
                          <h2 className="text-base font-semibold mb-3">Timeline</h2>
                          
                          {/* Chart container - increasing height from 240px to 320px */}
                          <div className="border rounded-md p-4 overflow-hidden" style={{ height: '320px' }}>
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
                            <div className="mt-4 border rounded-md p-3 bg-card">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">{selectedTool.name}</h4>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedTool(null)} className="h-6 w-6 p-0">
                                  ×
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                Duration: {selectedTool.duration.toFixed(2)}s
                              </div>
                              <div className="mb-2">
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Arguments:</h5>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
                                  {JSON.stringify(selectedTool.args, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
                                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
                                  {selectedTool.output}
                                </pre>
                              </div>
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
                  className="flex-1 p-0 m-0 data-[state=active]:flex h-full"
                >
                  <div className="flex w-full h-full">
                    {/* Left Panel - Spans List */}
                    <div className="w-60 border-r overflow-y-auto" style={{ height: 'calc(100vh - 110px)' }}>
                      <div className="p-4 border-b flex-shrink-0">
                        <h3 className="text-base font-semibold mb-1">Spans</h3>
                        <p className="text-xs text-muted-foreground">
                          {spans.length} span{spans.length !== 1 ? 's' : ''} in this trace
                        </p>
                      </div>
                      <div>
                        {spans.map((span, index) => (
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
                              <div className="flex items-center gap-1 text-xs mt-2 text-primary">
                                <IconCode size={14} />
                                <span>{span.tools_called.length} tool call{span.tools_called.length > 1 ? 's' : ''}</span>
                              </div>
                            )}
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
                    <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 110px)', maxHeight: 'calc(100vh - 110px)' }}>
                      {selectedSpan ? (
                        <div className="p-4">
                          <div className="mb-4 flex-shrink-0">
                            <h2 className="text-xl font-semibold">{selectedSpan.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                Duration: {formatDuration(selectedSpan.duration)}
                              </Badge>
                              <Badge variant="outline">
                                ID: {selectedSpan.span_id}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <Tabs defaultValue="completion" className="w-full">
                              <TabsList className="bg-transparent border-b w-full px-0 rounded-none h-10 justify-start gap-4 mb-4">
                                <TabsTrigger 
                                  value="completion" 
                                  className="text-base bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-medium rounded-none border-0 relative h-10"
                                >
                                  <span>Completion</span>
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
                                  value="timing" 
                                  className="text-base bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-medium rounded-none border-0 relative h-10"
                                >
                                  <span>Timing</span>
                                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary transform scale-x-0 transition-transform data-[state=active]:scale-x-100"></div>
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="completion" className="m-0 data-[state=active]:block">
                                <Card className="border-0 shadow-none">
                                  <CardHeader className="pb-2 border-b">
                                    <div className="flex items-center gap-2">
                                      <IconMessageCircle size={16} />
                                      <CardTitle className="text-base">Final Completion</CardTitle>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-4">
                                    <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">
                                      {selectedSpan.final_completion}
                                    </div>
                                  </CardContent>
                                </Card>
                              </TabsContent>
                              
                              <TabsContent value="tools" className="m-0 data-[state=active]:block">
                                <Card className="border-0 shadow-none">
                                  <CardHeader className="border-b pb-3">
                                    <CardTitle className="text-base">Tools Called</CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-4">
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
                                              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto w-full">
                                                {JSON.stringify(tool.args, null, 2)}
                                              </pre>
                                            </div>
                                            
                                            <div className="mt-3">
                                              <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
                                              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto w-full">
                                                {tool.output}
                                              </pre>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>
                              
                              <TabsContent value="timing" className="m-0 data-[state=active]:block">
                                <Card className="border-0 shadow-none">
                                  <CardHeader className="border-b pb-3">
                                    <CardTitle className="text-base">Timing Information</CardTitle>
                                  </CardHeader>
                                  <CardContent className="pt-4">
                                    <dl className="grid grid-cols-1 gap-4">
                                      <div className="pb-3">
                                        <dt className="text-sm font-medium text-muted-foreground">Duration</dt>
                                        <dd className="text-base" suppressHydrationWarning>{formatDuration(selectedSpan.duration)}</dd>
                                      </div>
                                    </dl>
                                  </CardContent>
                                </Card>
                              </TabsContent>
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
            
            {/* Gantt chart skeleton */}
            <div className="flex-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center mb-4">
                  <Skeleton className="w-32 h-4 mr-3" />
                  <div className="flex-1 relative h-6">
                    <Skeleton 
                      className="absolute h-full rounded-sm" 
                      style={{
                        left: `${Math.random() * 30}%`,
                        width: `${30 + Math.random() * 50}%`
                      }}
                    />
                  </div>
                </div>
              ))}
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