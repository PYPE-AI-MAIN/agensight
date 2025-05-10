import { NextResponse } from "next/server";

// Set the route to be static
export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { id: '8f4dfbea3ed048d3' },
    { id: 'f239d3d2a0c652e0' },
    {id:'c7e1d9b354a82f06'}
  ];
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get span ID from params
  const spanId = params?.id;
  
  // Create a simple response object
  const data = {
    span_id: spanId,
    prompts: [
      {
        content: "Present this nicely: 1. Outdoor yoga or exercise session in a park\n2. Brunch at a rooftop restaurant or cafe\n3. Visit a botanical garden or outdoor art exhibition\n4. Take a leisurely walk around a lake or nature reserve\n5. Enjoy a picnic in a nearby park\n6. Go for a swim at a pool or visit a water park\n7. Visit an outdoor market or street fair\n8. Plan a day trip to a nearby hill station or scenic spot\n9. Have a barbecue or outdoor dinner with friends and family\n10. Attend an outdoor concert or music festival.",
        id: 1,
        message_index: 0,
        role: "user",
        span_id: spanId
      }
    ],
    completions: [
      {
        content: "Looking for some fun outdoor activities to enjoy the beautiful weather? Here are 10 great ideas to make the most of the sunshine:\n\n1. Start your day with an invigorating outdoor yoga or exercise session in a nearby park to kickstart your morning.\n\n2. Treat yourself to a leisurely brunch at a rooftop restaurant or cafe with stunning views of the city skyline.\n\n3. Immerse yourself in the beauty of nature by visiting a botanical garden or outdoor art exhibition for a serene and inspiring experience.",
        completion_tokens: 150,
        finish_reason: "stop",
        id: 1,
        prompt_tokens: 100,
        role: "assistant",
        span_id: spanId,
        total_tokens: 250
      }
    ],
    tools: []
  };
  
  // Return the data
  return NextResponse.json(data);
}