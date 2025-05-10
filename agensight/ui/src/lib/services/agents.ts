// Service functions for agent operations

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";

/**
 * Updates an agent configuration
 * @param data Agent data to update
 * @returns Promise with the update result
 */
export async function updateAgent(data: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/update_agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Error updating agent: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to update agent:", error);
    throw error;
  }
}

/**
 * Updates a prompt
 * @param data Prompt data to update
 * @returns Promise with the update result
 */
export async function updatePrompt(data: any): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/update_prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Error updating prompt: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to update prompt:", error);
    throw error;
  }
}