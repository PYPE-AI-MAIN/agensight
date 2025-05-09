// ui_/src/app/api/update_prompt/route.ts
export const dynamic = "force-static";

export async function POST(request: Request) {
    try {
      const body = await request.json();

      // Add sync_to_main to the request if it's not already included
      if (body.sync_to_main === undefined) {
        body.sync_to_main = false;
      }
  
      const res = await fetch('http://127.0.0.1:5000/api/update_prompt', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
  
      const data = await res.json();
  
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Failed to update prompt:', err);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update prompt',
          success: false, 
          version: '1.0.0',
          synced_to_main: false,
          message: 'Failed to update prompt (demo mode)'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }