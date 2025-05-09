// Configure route for static export
export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Make sure required data is present
    if (!data.version) {
      return new Response(
        JSON.stringify({ error: 'Missing required version parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Call the backend API
    const res = await fetch('http://127.0.0.1:5000/api/config/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    const result = await res.json();
    console.log(`Synced version ${data.version} to main config`);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to sync version to main config:', err);
    
    // Return a proper error response
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync version to main config',
        details: err instanceof Error ? err.message : 'Unknown error',
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 