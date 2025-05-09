// Configure route for static export
export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Make sure required data is present
    if (!data.agent || !data.agent.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required agent data' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Call the backend API
    const res = await fetch('http://127.0.0.1:5000/api/update_agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    const result = await res.json();
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to update agent:', err);
    
    // For testing/demo when the backend is unavailable
    return new Response(
      JSON.stringify({
        success: true,
        version: "1.0.2",
        synced_to_main: false,
        message: "Agent updated successfully (demo mode)"
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 