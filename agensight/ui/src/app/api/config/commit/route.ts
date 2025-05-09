// Configure route for static export
export const dynamic = "force-static";

export async function POST(request: Request) {
  let requestData;
  try {
    requestData = await request.json();
    const commitMessage = requestData.commit_message || 'Configuration update';
    const syncToMain = requestData.sync_to_main === true;
    const sourceVersion = requestData.source_version;
    
    console.info(`Creating commit with message: "${commitMessage}", sync to main: ${syncToMain}, source version: ${sourceVersion}`);
    
    // Call the backend API
    const res = await fetch('http://127.0.0.1:5000/api/config/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commit_message: commitMessage,
        sync_to_main: syncToMain,
        source_version: sourceVersion
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    const result = await res.json();
    console.info(`Commit successful - new version: ${result.version}`);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to commit version:', err);
    
    // Return a proper error response
    return new Response(
      JSON.stringify({ 
        error: 'Failed to commit version',
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