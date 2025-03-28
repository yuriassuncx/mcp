import { InstallURL } from "../actions/mcps/configure.ts";
import { AppContext } from "../apps/site.ts";
import { MCP } from "../loaders/mcps/list.ts";
import { useId } from "site/sdk/useId.ts";
import { useScript } from "@deco/deco/hooks";

export interface Props {
  name?: string;
  mcp?: MCP;
  installURL?: InstallURL;
  error?: string;
}

export const loader = async (
  props: Props,
  req: Request,
  ctx: AppContext,
) => {
  const url = new URL(req.url);
  const name = url.pathname.split("/").pop() || props.name;

  if (!name) {
    return { ...props, error: "MCP name not provided" };
  }

  // @ts-ignore: TODO: fix this
  const mcps = await ctx.invoke.site.loaders.mcps.list();
  const mcp = mcps.find((m: MCP) => m.name === name);

  if (!mcp) {
    return { ...props, error: "MCP not found" };
  }

  return { ...props, name, mcp };
};

export const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
) => {
  try {
    const form = await req.formData();
    const formProps = Object.fromEntries(form.entries());
    const config = formProps.config;

    const installURL = await ctx.invoke.site.actions.mcps.configure({
      name: props.name!,
      // deno-lint-ignore no-explicit-any
      props: JSON.parse(config as any as string),
    });

    return { ...props, installURL };
  } catch (err) {
    return { ...props, error: err.message };
  }
};

export default function PDP({ mcp, error, installURL }: Props) {
  const slot = useId();
  const editorId = useId();
  const schemaId = useId();
  const errorId = useId();

  const setupMonaco = () => `
!function() {
  function waitForRequire() {
    if (!window.require) {
      setTimeout(waitForRequire, 100)
      return
    }
    window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.26.1/min/vs' }})
    window.require(['vs/editor/editor.main'], setupEditor)
  }

  function setupEditor() {
    var editorElement = document.getElementById('${editorId}')
    var schemaElement = document.getElementById('${schemaId}')
    var errorElement = document.getElementById('${errorId}')
    
    if (!editorElement || !schemaElement) {
      console.error('Required elements not found')
      return
    }

    try {
      var schema = JSON.parse(schemaElement.textContent || '{}')
      
      window.monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
        schemas: [{
          uri: "http://myschema/mcp-schema.json",
          fileMatch: ["*"],
          schema: schema
        }],
        enableSchemaRequest: false
      })

      window.monacoEditor = window.monaco.editor.create(editorElement, {
        value: '{}',
        language: 'json',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        roundedSelection: false,
        formatOnPaste: true,
        formatOnType: true,
        wordWrap: 'on'
      })

      // Add validation error listener
      window.monacoEditor.onDidChangeModelDecorations(function() {
        var model = window.monacoEditor.getModel()
        if (!model) return

        var errorMarkers = window.monaco.editor.getModelMarkers({ resource: model.uri })
        if (errorMarkers.length > 0) {
          var errors = errorMarkers.map(function(marker) {
            return marker.message
          }).join('\\n')
          if (errorElement) {
            errorElement.textContent = errors
            errorElement.style.display = 'block'
          }
        } else {
          if (errorElement) {
            errorElement.style.display = 'none'
          }
        }
      })

      if (window.monacoEditor.getAction('editor.action.formatDocument')) {
        window.monacoEditor.getAction('editor.action.formatDocument').run()
      }
    } catch (err) {
      console.error('Monaco initialization error:', err)
      if (errorElement) {
        errorElement.textContent = 'Failed to initialize editor: ' + err.message
        errorElement.style.display = 'block'
      }
    }
  }

  waitForRequire()
}()`;

  const script = useScript(setupMonaco());

  const handleSubmit = () => `
!function() {
  var editor = window.monacoEditor
  var errorElement = document.getElementById('${errorId}')
  
  if (!editor) {
    console.error('Editor not initialized')
    if (errorElement) {
      errorElement.textContent = 'Editor not initialized'
      errorElement.style.display = 'block'
    }
    return
  }
  
  try {
    var jsonInput = editor.getValue() || '{}'
    var parsedJson = JSON.parse(jsonInput)
    
    // Check for validation errors before submitting
    var model = editor.getModel()
    if (model) {
      var markers = window.monaco.editor.getModelMarkers({ resource: model.uri })
      if (markers.length > 0) {
        if (errorElement) {
          errorElement.textContent = 'Please fix validation errors before submitting'
          errorElement.style.display = 'block'
        }
        return
      }
    }

    var form = new FormData()
    form.append('config', JSON.stringify(parsedJson))

    if (errorElement) {
      errorElement.style.display = 'none'
    }

    fetch(window.location.href, {
      method: 'POST',
      body: form
    })
    .then(function(response) { return response.text() })
    .then(function(result) {
      var slot = document.getElementById('${slot}')
      if (slot) slot.innerHTML = result
    })
    .catch(function(err) {
      console.error('Submit error:', err)
      if (errorElement) {
        errorElement.textContent = 'Failed to submit: ' + err.message
        errorElement.style.display = 'block'
      }
    })
  } catch (err) {
    console.error('JSON parse error:', err)
    if (errorElement) {
      errorElement.textContent = 'Invalid JSON format: ' + err.message
      errorElement.style.display = 'block'
    }
  }
}()`;

  if (error) {
    return (
      <div class="container mx-auto p-4">
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (installURL?.success) {
    return (
      <div class="container mx-auto p-4">
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <h2 class="text-xl font-bold mb-2">Installation Successful!</h2>
          <p class="mb-4">Your MCP URL:</p>
          <code class="block bg-green-50 p-4 rounded">{installURL.url}</code>
        </div>
      </div>
    );
  }

  if (!mcp) {
    return null;
  }

  return (
    <div class="container mx-auto p-4">
      <h1 class="text-4xl font-bold mb-8">{mcp.name}</h1>
      <p class="text-gray-600 mb-8">{mcp.description}</p>

      <div class="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 class="text-2xl font-bold mb-6">Configure Installation</h2>
        <form method="POST">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">
              Configuration JSON
            </label>
            <div
              id={editorId}
              style={{
                width: "100%",
                height: "400px",
                border: "1px solid #e2e8f0",
                borderRadius: "0.375rem",
              }}
            />
            <div
              id={errorId}
              class="mt-2 text-red-600 text-sm hidden"
              style={{ display: "none" }}
            />
          </div>
          <button
            type="button"
            onclick={handleSubmit()}
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            <span class="[.htmx-request_&]:hidden inline">Install</span>
            <span class="[.htmx-request_&]:inline hidden loading loading-spinner loading-sm" />
          </button>
        </form>

        <div id={slot} />
      </div>

      {/* Store the input schema */}
      <script
        id={schemaId}
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(mcp.inputSchema || {}),
        }}
      />

      {/* Monaco Editor CSS */}
      <link
        rel="stylesheet"
        data-name="vs/editor/editor.main"
        href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.26.1/min/vs/editor/editor.main.min.css"
      />

      {/* Monaco Editor Loader */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.26.1/min/vs/loader.min.js" />

      {/* Initialize Monaco */}
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </div>
  );
}
