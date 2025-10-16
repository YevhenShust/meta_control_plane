// Password hashing utility using Web Crypto API (SHA-256 placeholder)
// This implementation can be easily replaced with a different algorithm later

export async function hashPassword(plainPassword: string): Promise<string> {
  // Use Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(plainPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
