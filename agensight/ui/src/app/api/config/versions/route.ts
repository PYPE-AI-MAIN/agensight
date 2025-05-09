import { getAllFallbackConfigs, getDefaultConfig } from '../../../../lib/fallbackConfigs';

// Configure route for static export
export const dynamic = "force-static";

export async function GET() {
  try {
    // Try to fetch versions from the backend
    const res = await fetch('http://127.0.0.1:5000/api/config/versions', {
      // Add a cache-control header to prevent caching
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    // Check if successful
    if (res.ok) {
      const data = await res.json();
      
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    
    // If we get a 403 or any other error, fall back to our static data
    console.error(`API error: ${res.status} ${res.statusText}`);
    // Fall through to fallback data instead of throwing
  } catch (err) {
    console.error('Failed to fetch config versions:', err);
    // Continue to fallback data
  }
  
  // Use fallback configs when API is unavailable
  try {
    // Check if .agensight directory would exist in real system
    // For fallback, we'll always show a default version initially
    const defaultConfig = getDefaultConfig();
    const fallbackConfigs = getAllFallbackConfigs();
    
    // Map configs to version history format
    // Include default config as the current version
    const fallbackVersions = [
      {
        version: defaultConfig.version,
        commit_message: "Default configuration (no versions saved yet)",
        timestamp: new Date().toISOString(),
        is_current: true
      },
      ...fallbackConfigs.map((config, index) => ({
        version: config.version,
        commit_message: config.commit_message,
        timestamp: config.timestamp,
        is_current: false
      }))
    ];
    
    // Add header to indicate this is fallback data
    return new Response(JSON.stringify(fallbackVersions), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Fallback-Data': 'true',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (fallbackErr) {
    console.error('Failed to generate fallback version history:', fallbackErr);
    
    // Return error response with useful information
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch version history',
        details: 'Backend service unavailable and fallback data failed to load',
        status: 'error'
      }),
      {
        status: 503, // Service Unavailable
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
} 