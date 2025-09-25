/**
 * Simple Slack OAuth selection page
 */
export function createSlackSelectionHTML(params: {
  returnUrl?: string | null;
  integrationId?: string | null;
  installId: string;
}): Response {
  const queryParams = new URLSearchParams();
  if (params.returnUrl) queryParams.set("returnUrl", params.returnUrl);
  if (params.integrationId) queryParams.set("integrationId", params.integrationId);
  queryParams.set("installId", params.installId);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to Slack - deco.chat</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen py-12">
  <div class="max-w-2xl mx-auto px-4">
    <div class="bg-white rounded-xl shadow-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <svg class="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.042 15.165a2.528 2.528 0 0 0 2.5 2.5c1.61 0 2.929-1.3 2.929-2.929V9.165h-2.93c-1.38 0-2.5 1.12-2.5 2.5v3.5zm2.5-7.5c0-1.38 1.12-2.5 2.5-2.5h7.5v2.929c0 1.38-1.119 2.5-2.5 2.5H7.542v-2.929zm7.5 0V5.036c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v2.629H15.042zm0 7.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5v-2.5h2.5z"/>
            </svg>
          </div>
          <div class="text-white">
            <h1 class="text-2xl font-bold">Connect to Slack</h1>
            <p class="text-purple-100">Choose how to connect your integration</p>
          </div>
        </div>
      </div>
      <div class="p-8 space-y-6">
        <!-- Native Bot Option -->
        <div class="border-2 border-green-200 rounded-lg p-6 hover:border-green-300 transition-colors bg-green-50">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-green-600 text-xl">🤖</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Native deco.chat Bot</h3>
              <span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Recommended
              </span>
            </div>
          </div>
          <p class="text-gray-600 text-sm mb-4">
            Use the official deco.chat bot with automatic configuration. No setup required.
          </p>
          <a href="/oauth/start?appName=slack&${queryParams.toString()}" 
             class="inline-block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors text-center">
            Continue with Native Bot
          </a>
        </div>
        <!-- Custom Bot Option -->
        <div class="border-2 border-gray-200 rounded-lg p-6">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-blue-600 text-xl">⚙️</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Custom Bot</h3>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Advanced
              </span>
            </div>
          </div>
          <p class="text-gray-600 text-sm mb-4">
            Use your own Slack bot with custom permissions and branding.
          </p>
          
          <form id="customBotForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Bot Name (Optional)</label>
              <input type="text" id="customBotName" placeholder="e.g., MyCompany Bot" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <p class="text-xs text-gray-500 mt-1">Identifier for your custom bot (defaults to "deco.chat" if empty)</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
              <input type="text" id="clientId" placeholder="e.g., 6013077820118.8958568123061" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
              <input type="password" id="clientSecret" placeholder="Your Slack Client Secret" 
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            <button type="submit" 
                    class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Continue with Custom Bot
            </button>
          </form>
        </div>
        ${params.returnUrl ? `
        <div class="text-center pt-4">
          <a href="${params.returnUrl}" class="text-gray-600 hover:text-gray-800 transition-colors">
            ← Back to previous page
          </a>
        </div>
        ` : ''}
      </div>
    </div>
  </div>
  <script>
    document.getElementById('customBotForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      const clientId = document.getElementById('clientId').value;
      const clientSecret = document.getElementById('clientSecret').value;
      const customBotName = document.getElementById('customBotName').value;
      
      if (!clientId || !clientSecret) {
        alert('Please fill in both Client ID and Client Secret.');
        return;
      }
      
      const params = new URLSearchParams('${queryParams.toString()}');
      params.set('customBot', 'true');
      params.set('clientId', clientId);
      params.set('clientSecret', clientSecret);
      if (customBotName) params.set('customBotName', customBotName);
      
      window.location.href = '/oauth/start?appName=slack&' + params.toString();
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}