# Slack OAuth Module

This module provides enhanced Slack OAuth integration with support for both native and custom bots.

## Architecture

The module is organized into separate, focused files:

- **`utils.ts`** - Core utility functions for Slack OAuth logic
- **`handlers.ts`** - HTTP request handlers and routing logic  
- **`mod.ts`** - Module index with public API exports

## Key Features

### Dual Bot Support
- **Native Bot**: Uses deco.chat's official Slack bot (recommended)
- **Custom Bot**: Allows users to connect their own Slack bots

### Clean Separation of Concerns
- OAuth logic is separated from HTML rendering
- Validation logic is modular and reusable
- Handlers are focused on HTTP concerns only

### Robust Fallbacks
- Component rendering with HTML fallback
- Parameter validation with clear error messages
- Graceful handling of missing credentials

## Usage

### In OAuth Router
```typescript
import { 
  handleSlackAuthPage,
  shouldRedirectToSlackSelection,
  createSlackSelectionRedirect 
} from "./apps/deco/slack/mod.ts";

// Check if request needs Slack selection page
if (shouldRedirectToSlackSelection(appName, url)) {
  return createSlackSelectionRedirect(c);
}

// Handle Slack auth selection page
app.get("/slack-auth", handleSlackAuthPage);
```

### Parameter Analysis
```typescript
import { analyzeSlackOAuthRequest } from "./apps/deco/slack/mod.ts";

const analysis = analyzeSlackOAuthRequest(appName, url);
// { isSlackAuth: boolean, hasCustomBotParams: boolean, shouldShowSelection: boolean }
```

### Validation
```typescript
import { validateSlackOAuthRequest } from "./apps/deco/slack/mod.ts";

const validation = validateSlackOAuthRequest(url);
if (!validation.isValid) {
  return c.json({ error: validation.error }, 400);
}
```

## File Structure

```
apps/deco/slack/
├── mod.ts          # Module index and exports
├── utils.ts        # Core utilities and business logic  
├── handlers.ts     # HTTP handlers and routing
└── README.md       # This file
```

## API Reference

### Utils (`utils.ts`)

- `isSlackApp(appName: string): boolean` - Check if app is Slack
- `hasCustomBotParameters(url: URL): boolean` - Check for custom bot params
- `analyzeSlackOAuthRequest(appName, url): SlackOAuthConfig` - Analyze request type
- `buildSlackSelectionUrl(baseUrl, params): string` - Build selection page URL
- `extractSlackOAuthParams(url: URL)` - Extract all OAuth parameters
- `validateCustomBotCredentials(clientId, clientSecret)` - Validate credentials

### Handlers (`handlers.ts`)

- `handleSlackAuthPage(c: Context): Promise<Response>` - Render selection page
- `shouldRedirectToSlackSelection(appName, url): boolean` - Check redirect need
- `createSlackSelectionRedirect(c: Context): Response` - Create redirect response
- `validateSlackOAuthRequest(url: URL)` - Validate request parameters

## Testing

The module includes comprehensive parameter validation and error handling:

```bash
# Test URLs
/oauth/start?appName=slack&installId=123                    # -> Redirects to selection
/oauth/start?appName=slack&customBot=true&clientId=...      # -> Direct OAuth
/slack-auth?returnUrl=...&installId=123                     # -> Selection page
```

## Error Handling

All functions return structured error objects:

```typescript
{ isValid: boolean; error?: string }
```

Common validation errors:
- Missing Client ID or Client Secret for custom bot
- Invalid credential format
- Missing required parameters