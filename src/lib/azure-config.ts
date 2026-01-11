/**
 * Azure AI Services Configuration
 *
 * All AI services run through Azure:
 * - Claude (via Azure AI)
 * - FLUX.2 [pro] (via Azure AI Model Inference)
 * - Embeddings (via Azure OpenAI)
 */

// Azure OpenAI configuration for embeddings
export const AZURE_OPENAI_CONFIG = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  embeddingDeployment: process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
};

// Azure AI Model Inference configuration for FLUX.2
export const AZURE_AI_CONFIG = {
  endpoint: process.env.AZURE_AI_ENDPOINT || '',
  apiKey: process.env.AZURE_AI_API_KEY || '',
  fluxDeployment: process.env.AZURE_FLUX_DEPLOYMENT || 'flux-2-pro',
};

// Azure Claude configuration
export const AZURE_CLAUDE_CONFIG = {
  endpoint: process.env.AZURE_CLAUDE_ENDPOINT || '',
  apiKey: process.env.AZURE_CLAUDE_API_KEY || '',
};

/**
 * Validate that required Azure configuration is present
 */
export function validateAzureConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check OpenAI config for embeddings
  if (!AZURE_OPENAI_CONFIG.endpoint) missing.push('AZURE_OPENAI_ENDPOINT');
  if (!AZURE_OPENAI_CONFIG.apiKey) missing.push('AZURE_OPENAI_API_KEY');

  // Check AI config for FLUX
  if (!AZURE_AI_CONFIG.endpoint) missing.push('AZURE_AI_ENDPOINT');
  if (!AZURE_AI_CONFIG.apiKey) missing.push('AZURE_AI_API_KEY');

  return {
    valid: missing.length === 0,
    missing,
  };
}
