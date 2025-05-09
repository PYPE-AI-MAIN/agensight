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

// Define the more detailed trace data structure
interface ToolCall {
  args: Record<string, any>;
  duration: number;
  name: string;
  output: string;
  span_id: string;
}

interface Agent {
  span_id: string;
  name: string;
  duration: number;
  start_time: number;
  end_time: number;
  tools_called: ToolCall[];
  final_completion: string;
}

interface DetailedTraceData {
  trace: TraceItem;
  trace_input: string;
  trace_output: string;
  agents: Agent[];
}

// Mock data for a single trace with detailed information
const mockDetailedTraceData: Record<string, DetailedTraceData> = {
  "1": {
    trace: {
      id: 1,
      name: "Weather and Trip Planning",
      session_id: "sess_aB3cD8eF9gH0iJ1",
      started_at: "2023-10-10T09:32:15Z",
      ended_at: "2023-10-10T09:33:45Z",
      metadata: JSON.stringify({
        user_id: "usr_123456",
        request_type: "general_query",
        priority: "medium",
        tags: ["weather", "travel", "planning"],
        steps_completed: 3,
        total_steps: 3,
        status: "completed"
      }, null, 2)
    },
    trace_input: "What's the weather in New York and the latest news about technology? Also, can you help me plan a day trip to the city?",
    trace_output: "Today in New York, it's 68°F and partly cloudy with a 20% chance of rain in the afternoon.\n\nFor the latest tech news, Apple just announced their new iPhone 15 with improved camera capabilities and longer battery life. Microsoft released a major Windows update with new AI features, and Tesla unveiled plans for a more affordable electric vehicle.\n\nHere's a suggested day trip itinerary for New York City:\n\n9:00 AM - Start with breakfast at a local cafe in Greenwich Village\n10:30 AM - Visit the Metropolitan Museum of Art\n1:00 PM - Grab lunch at Chelsea Market\n2:30 PM - Take a walk on the High Line\n4:00 PM - Visit the One World Observatory for panoramic views\n6:00 PM - Dinner in Little Italy\n8:00 PM - Catch a Broadway show (if available)\n\nWould you like me to recommend specific restaurants or exhibits at the museum?",
    agents: [
      {
        duration: 2.01,
        end_time: 1746780323.51,
        final_completion: "As of now, the weather in New York is partly cloudy with a temperature of 68°F. There's a slight chance of rain in the afternoon.\n\nAs for the latest technology news, Apple has announced their new iPhone 15 with improved camera capabilities and longer battery life. Microsoft released a major Windows update with new AI features, and Tesla unveiled plans for a more affordable electric vehicle.",
        name: "Agent 1",
        span_id: "8f4dfbea3ed048d3",
        start_time: 1746780321.5,
        tools_called: [
          {
            args: {
              location: "New York"
            },
            duration: 1.16,
            name: "get_weather",
            output: "{\"location\": \"New York\", \"temperature\": \"68°F\", \"condition\": \"partly cloudy\", \"precipitation\": \"20% chance in afternoon\"}",
            span_id: "b8e52c49f98389b1"
          },
          {
            args: {
              topic: "technology"
            },
            duration: 0.98,
            name: "get_news",
            output: "{\"topic\": \"technology\", \"articles\": [{\"title\": \"Apple Announces iPhone 15\", \"summary\": \"Improved camera and battery\"}, {\"title\": \"Microsoft Releases Windows Update\", \"summary\": \"New AI features added\"}, {\"title\": \"Tesla Plans Affordable EV\", \"summary\": \"New model targeting lower price point\"}]}",
            span_id: "c9f63d58a7940ac2"
          }
        ]
      },
      {
        duration: 2.35,
        end_time: 1746780325.87,
        final_completion: "Based on the weather in New York and your interest in planning a day trip, here's a suggested itinerary:\n\n1. Morning (9:00 AM - 12:00 PM):\n   - Start with breakfast at a local cafe in Greenwich Village\n   - Visit the Metropolitan Museum of Art (opens at 10:00 AM)\n\n2. Afternoon (12:00 PM - 5:00 PM):\n   - Grab lunch at Chelsea Market (lots of indoor options in case of afternoon rain)\n   - Take a walk on the High Line if weather permits\n   - Visit the One World Observatory for panoramic views\n\n3. Evening (5:00 PM - 9:00 PM):\n   - Dinner in Little Italy\n   - Catch a Broadway show or visit Times Square\n\nThis schedule can be adjusted based on weather conditions and your interests.",
        name: "Agent 2",
        span_id: "f239d3d2a0c652e0",
        start_time: 1746780323.51,
        tools_called: [
          {
            args: {
              location: "New York",
              interest: "day trip"
            },
            duration: 1.45,
            name: "plan_itinerary",
            output: "{\"location\": \"New York\", \"type\": \"day trip\", \"weather_aware\": true, \"itinerary\": [{\"time\": \"morning\", \"activities\": [\"breakfast in Greenwich Village\", \"Metropolitan Museum of Art\"]}, {\"time\": \"afternoon\", \"activities\": [\"lunch at Chelsea Market\", \"High Line walk\", \"One World Observatory\"]}, {\"time\": \"evening\", \"activities\": [\"dinner in Little Italy\", \"Broadway show or Times Square\"]}]}",
            span_id: "d7e41f63b8a529d7"
          }
        ]
      },
      {
        duration: 2.27,
        end_time: 1746780328.14,
        final_completion: "Today in New York, it's 68°F and partly cloudy with a 20% chance of rain in the afternoon.\n\nFor the latest tech news, Apple just announced their new iPhone 15 with improved camera capabilities and longer battery life. Microsoft released a major Windows update with new AI features, and Tesla unveiled plans for a more affordable electric vehicle.\n\nHere's a suggested day trip itinerary for New York City:\n\n9:00 AM - Start with breakfast at a local cafe in Greenwich Village\n10:30 AM - Visit the Metropolitan Museum of Art\n1:00 PM - Grab lunch at Chelsea Market\n2:30 PM - Take a walk on the High Line\n4:00 PM - Visit the One World Observatory for panoramic views\n6:00 PM - Dinner in Little Italy\n8:00 PM - Catch a Broadway show (if available)\n\nWould you like me to recommend specific restaurants or exhibits at the museum?",
        name: "Agent 3",
        span_id: "74a786be29319f04",
        start_time: 1746780325.87,
        tools_called: []
      }
    ]
  },
  "2": {
    trace: {
      id: 2,
      name: "Bangalore Weather and AI News",
      session_id: "sess_kL2mN3oP4qR5sT6",
      started_at: "2023-10-11T14:21:08Z",
      ended_at: "2023-10-11T14:21:58Z",
      metadata: JSON.stringify({
        user_id: "usr_789012",
        request_type: "general_query",
        tags: ["weather", "ai", "activity_planning"],
        steps_completed: 3,
        total_steps: 3,
        status: "completed"
      }, null, 2)
    },
    trace_input: "What's the weather in Bangalore and latest AI news?",
    trace_output: "\n\nBased on the current pleasant weather in Bangalore, we have some great suggestions for how you can make the most of your day.\n\nIn the morning, start your day with some outdoor yoga or exercise to soak in the fresh air and sunshine. After that, head to a rooftop cafe or garden restaurant for a delightful brunch experience.\n\nIn the afternoon, take a leisurely walk in a botanical garden or park to enjoy the beautiful weather. You can also explore local markets or outdoor shopping areas to indulge in some retail therapy. Consider having a picnic in a nearby park or green space for a relaxing afternoon.\n\nIn the evening, don't miss the chance to watch the sunset at a scenic spot. You can also attend an outdoor concert or performance for some entertainment. Finally, wrap up your day with a delightful dinner at an outdoor restaurant or rooftop bar.\n\nAs for the latest AI news, we recommend checking reliable news sources or AI-focused websites for the most up-to-date information. Enjoy your day in Bangalore!",
    agents: [
      {
        span_id: "bae29aaa103811ce",
        name: "Planner",
        duration: 2.01,
        start_time: 1746780321.5,
        end_time: 1746780323.51,
        tools_called: [
          {
            name: "get_weather",
            args: {
              location: "Bangalore"
            },
            output: "{\"location\": \"Bangalore\", \"temperature\": \"25°C\", \"condition\": \"sunny\", \"humidity\": \"65%\" }",
            duration: 1.16,
            span_id: "e2bbbb910d6b507e"
          },
          {
            name: "get_news",
            args: {
              topic: "AI"
            },
            output: "{\"topic\": \"AI\", \"articles\": [{\"title\": \"New Language Model Released\", \"summary\": \"Industry leader introduces more capable AI\"}, {\"title\": \"AI Regulations Update\", \"summary\": \"New guidelines for responsible AI development\"}, {\"title\": \"AI for Healthcare\", \"summary\": \"Breakthrough in medical diagnosis using AI\"}]}",
            duration: 1.16,
            span_id: "e2bbbb910d6b507e"
          }
        ],
        final_completion: "As of now, the weather in Bangalore is sunny with a temperature of 25°C.\n\nAs for the latest AI news, I would recommend checking reliable news sources or AI-focused websites for the most up-to-date information."
      },
      {
        span_id: "e788bb5087802c48",
        name: "Activity Planner",
        duration: 2.35,
        start_time: 1746780323.51,
        end_time: 1746780325.87,
        tools_called: [],
        final_completion: "Based on the current weather in Bangalore, here are some suggested activities:\n\n1. Morning: \n   - Outdoor yoga or exercise\n   - Brunch at a rooftop cafe or garden restaurant\n\n2. Afternoon:\n   - Visit a botanical garden or park for a leisurely walk\n   - Explore local markets or outdoor shopping areas\n   - Enjoy a picnic in a nearby park or green space\n\n3. Evening:\n   - Watch the sunset at a scenic spot\n   - Attend an outdoor concert or performance\n   - Have dinner at an outdoor restaurant or rooftop bar\n\nAs for the latest AI news, I would recommend checking reliable news sources or AI-focused websites for the most up-to-date information."
      },
      {
        span_id: "5baaa0037e147bc2",
        name: "Final Presenter",
        duration: 2.27,
        start_time: 1746780325.87,
        end_time: 1746780328.14,
        tools_called: [],
        final_completion: "\n\nBased on the current pleasant weather in Bangalore, we have some great suggestions for how you can make the most of your day.\n\nIn the morning, start your day with some outdoor yoga or exercise to soak in the fresh air and sunshine. After that, head to a rooftop cafe or garden restaurant for a delightful brunch experience.\n\nIn the afternoon, take a leisurely walk in a botanical garden or park to enjoy the beautiful weather. You can also explore local markets or outdoor shopping areas to indulge in some retail therapy. Consider having a picnic in a nearby park or green space for a relaxing afternoon.\n\nIn the evening, don't miss the chance to watch the sunset at a scenic spot. You can also attend an outdoor concert or performance for some entertainment. Finally, wrap up your day with a delightful dinner at an outdoor restaurant or rooftop bar.\n\nAs for the latest AI news, we recommend checking reliable news sources or AI-focused websites for the most up-to-date information. Enjoy your day in Bangalore!"
      }
    ]
  },
  "3": {
    trace: {
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
    },
    trace_input: "Process sales data for Q3 2023 and generate trend analysis",
    trace_output: "I've processed the Q3 2023 sales data and generated a trend analysis. Here are the key findings:\n\n1. Overall sales increased by 12.7% compared to Q2 2023 and 18.3% compared to Q3 2022.\n2. The highest performing product category was 'Electronics' with a 23.5% growth.\n3. Regional analysis shows strongest growth in the Western region (27.1%).\n4. Customer retention rate improved to 78.3% from 72.1% in the previous quarter.\n5. Average transaction value increased by 8.2%.\n\nThe detailed analysis with visualizations has been saved to your specified output location in parquet format. Would you like me to generate any specific charts or focus on a particular aspect of the data?",
    agents: [
      {
        span_id: "c7e1d9b354a82f06",
        name: "Data Processor",
        duration: 8.45,
        start_time: 1744502722.32,
        end_time: 1744502730.77,
        tools_called: [
          {
            name: "load_dataset",
            args: {
              dataset_id: "ds_456789",
              format: "csv"
            },
            output: "{\"status\": \"success\", \"rows_loaded\": 157842, \"columns\": 24, \"memory_usage\": \"128MB\"}",
            duration: 3.27,
            span_id: "a1b2c3d4e5f6g7h8"
          },
          {
            name: "clean_data",
            args: {
              operations: ["remove_duplicates", "handle_nulls", "normalize_dates"]
            },
            output: "{\"original_rows\": 157842, \"cleaned_rows\": 157830, \"duplicates_removed\": 12, \"nulls_filled\": 87}",
            duration: 2.13,
            span_id: "i9j0k1l2m3n4o5p6"
          }
        ],
        final_completion: "Data processing complete. Loaded 157,842 rows of Q3 2023 sales data, removed 12 duplicate entries, and handled 87 null values. The cleaned dataset is ready for analysis."
      },
      {
        span_id: "q7r8s9t0u1v2w3x4",
        name: "Analyzer",
        duration: 15.67,
        start_time: 1744502730.77,
        end_time: 1744502746.44,
        tools_called: [
          {
            name: "run_analysis",
            args: {
              analysis_type: "trend",
              time_period: "quarterly",
              comparisons: ["previous_quarter", "previous_year"]
            },
            output: "{\"overall_growth\": 12.7, \"yoy_growth\": 18.3, \"category_performance\": {\"Electronics\": 23.5, \"Home\": 15.2, \"Clothing\": 8.9, \"Food\": 10.1}, \"regional_data\": {\"West\": 27.1, \"East\": 14.8, \"Central\": 19.2, \"South\": 21.3}, \"customer_metrics\": {\"retention\": 78.3, \"previous_retention\": 72.1, \"avg_transaction\": {\"current\": 128.32, \"previous\": 118.59, \"change\": 8.2}}}",
            duration: 12.45,
            span_id: "y5z6a7b8c9d0e1f2"
          }
        ],
        final_completion: "Analysis complete. Key findings include:\n- 12.7% quarterly sales growth (18.3% year-over-year)\n- Electronics leading with 23.5% growth\n- Western region showing strongest performance (27.1%)\n- Customer retention improved to 78.3%\n- Average transaction value up by 8.2%"
      },
      {
        span_id: "g3h4i5j6k7l8m9n0",
        name: "Report Generator",
        duration: 6.03,
        start_time: 1744502746.44,
        end_time: 1744502752.47,
        tools_called: [
          {
            name: "export_data",
            args: {
              format: "parquet",
              include_analysis: true,
              compression: "snappy"
            },
            output: "{\"status\": \"success\", \"file_path\": \"/outputs/q3_2023_sales_analysis.parquet\", \"file_size\": \"42.8MB\", \"tables\": [\"raw_data\", \"trend_analysis\", \"regional_breakdown\", \"category_performance\", \"customer_metrics\"]}",
            duration: 4.83,
            span_id: "o1p2q3r4s5t6u7v8"
          }
        ],
        final_completion: "I've processed the Q3 2023 sales data and generated a trend analysis. Here are the key findings:\n\n1. Overall sales increased by 12.7% compared to Q2 2023 and 18.3% compared to Q3 2022.\n2. The highest performing product category was 'Electronics' with a 23.5% growth.\n3. Regional analysis shows strongest growth in the Western region (27.1%).\n4. Customer retention rate improved to 78.3% from 72.1% in the previous quarter.\n5. Average transaction value increased by 8.2%.\n\nThe detailed analysis with visualizations has been saved to your specified output location in parquet format. Would you like me to generate any specific charts or focus on a particular aspect of the data?"
      }
    ]
  }
};

// Mock data for a single trace (keeping the original structure for backward compatibility)
const mockTraceData: Record<string, TraceItem> = {
  "1": mockDetailedTraceData["1"].trace,
  "2": mockDetailedTraceData["2"].trace,
  "3": mockDetailedTraceData["3"].trace
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if detailed trace exists
  if (id in mockDetailedTraceData) {
    // Return both trace metadata and detailed data
    return NextResponse.json(mockDetailedTraceData[id]);
  } else if (id in mockTraceData) {
    // Backward compatibility for old route
    return NextResponse.json(mockTraceData[id]);
  }
  
  return new NextResponse(
    JSON.stringify({ error: "Trace not found" }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
} 