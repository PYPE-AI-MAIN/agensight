export const dynamic = "force-static";

export async function GET(request: Request) {
  try {
    // Extract version parameter from URL if present
    const url = new URL(request.url);
    const version = url.searchParams.get('version');
    
    console.log("Requested version:", version);
    
    const apiUrl = version 
      ? `http://127.0.0.1:5000/api/config?version=${version}`
      : 'http://127.0.0.1:5000/api/config';
      
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      console.error(`API error: ${res.status} ${res.statusText}`);
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to fetch config:', err);
    
    // In case of server error, return a basic error response
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch configuration data',
        details: err instanceof Error ? err.message : 'Unknown error',
        status: 'error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
  