/**
 * Slack OAuth Integration Module
 * 
 * This module provides enhanced Slack OAuth functionality with support for both:
 * - Native deco.chat bot (automatic configuration)  
 * - Custom user bots (user-provided credentials)
 * 
 * @module slack
 */

export * from "./utils.ts";

// Re-export main utilities for convenience
export {
  isSlackApp,
  hasCustomBotParameters,
  analyzeSlackOAuthRequest,
  buildSlackSelectionUrl,
  validateCustomBotCredentials,
  shouldRedirectToSelection,
  validateSlackOAuthParams,
  getSlackStartParams,
  extractSlackOAuthParams
} from "./utils.ts";