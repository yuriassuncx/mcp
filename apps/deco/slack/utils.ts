/**
 * Slack OAuth utilities and helpers
 */

export interface SlackOAuthConfig {
  isSlackAuth: boolean;
  hasCustomBotParams: boolean;
  shouldShowSelection: boolean;
}

/**
 * Check if the app name refers to Slack
 */
export function isSlackApp(appName: string): boolean {
  if (!appName) return false;
  
  const normalized = appName.toLowerCase();
  return normalized === "slack" || 
         normalized.startsWith("slack-") ||
         normalized.startsWith("slack_");
}

/**
 * Check if the URL contains custom bot parameters
 */
export function hasCustomBotParameters(url: URL): boolean {
  return url.searchParams.has("customBot") || 
         url.searchParams.has("clientId");
}

/**
 * Analyze Slack OAuth request and determine routing
 */
export function analyzeSlackOAuthRequest(appName: string, url: URL): SlackOAuthConfig {
  const isSlackAuth = isSlackApp(appName);
  const hasCustomBotParams = hasCustomBotParameters(url);
  const shouldShowSelection = isSlackAuth && !hasCustomBotParams;
  
  return {
    isSlackAuth,
    hasCustomBotParams,
    shouldShowSelection,
  };
}

/**
 * Build Slack selection page URL
 */
export function buildSlackSelectionUrl(baseUrl: string, params: {
  returnUrl?: string | null;
  integrationId?: string | null;
  installId: string;
}): string {
  const selectionUrl = new URL("/slack-auth", baseUrl);
  
  if (params.returnUrl) {
    selectionUrl.searchParams.set("returnUrl", params.returnUrl);
  }
  if (params.integrationId) {
    selectionUrl.searchParams.set("integrationId", params.integrationId);
  }
  selectionUrl.searchParams.set("installId", params.installId);
  
  return selectionUrl.href;
}

/**
 * Extract Slack OAuth parameters from URL
 */
export function extractSlackOAuthParams(url: URL) {
  return {
    isCustomBot: url.searchParams.get("customBot") === "true",
    customClientId: url.searchParams.get("clientId"),
    customClientSecret: url.searchParams.get("clientSecret"),
    customBotName: url.searchParams.get("customBotName"),
    returnUrl: url.searchParams.get("returnUrl"),
    integrationId: url.searchParams.get("integrationId"),
  };
}

/**
 * Validate custom bot credentials
 */
export function validateCustomBotCredentials(
  clientId?: string | null, 
  clientSecret?: string | null
): { isValid: boolean; error?: string } {
  if (!clientId || !clientSecret) {
    return {
      isValid: false,
      error: "Both Client ID and Client Secret are required for custom bot",
    };
  }
  
  if (clientId.length < 10) {
    return {
      isValid: false, 
      error: "Client ID appears to be invalid",
    };
  }
  
  if (clientSecret.length < 10) {
    return {
      isValid: false,
      error: "Client Secret appears to be invalid", 
    };
  }
  
  return { isValid: true };
}

/**
 * Check if Slack should redirect to selection page
 */
export function shouldRedirectToSelection(appName: string, url: URL): boolean {
  const config = analyzeSlackOAuthRequest(appName, url);
  return config.shouldShowSelection;
}

/**
 * Validate Slack OAuth parameters
 */
export function validateSlackOAuthParams(url: URL): { isValid: boolean; error?: string } {
  const params = extractSlackOAuthParams(url);
  
  // If custom bot is enabled, validate credentials
  if (params.isCustomBot) {
    return validateCustomBotCredentials(params.customClientId, params.customClientSecret);
  }
  
  return { isValid: true };
}

/**
 * Get Slack-specific start parameters
 */
export function getSlackStartParams(url: URL): Record<string, unknown> {
  const params = extractSlackOAuthParams(url);
  return {
    isCustomBot: params.isCustomBot,
    customClientId: params.customClientId,
    customClientSecret: params.customClientSecret,
    customBotName: params.customBotName,
  };
}