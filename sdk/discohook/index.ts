// Definição de tipo simples sem importação externa
type JSONSchema = Record<string, unknown>;

export interface DiscohookMCPConfig {
  /**
   * @title Webhook URL
   * @description The Discord webhook URL
   */
  webhookUrl: string;
  
  /**
   * @title Username
   * @description The username that will appear when sending messages
   */
  username?: string;
  
  /**
   * @title Avatar URL
   * @description URL for the avatar that will be displayed
   */
  avatarUrl?: string;
}

export interface MessageContent {
  /**
   * @title Content
   * @description The message content to send
   */
  content: string;
  
  /**
   * @title Username
   * @description Override the default username for this message
   */
  username?: string;
  
  /**
   * @title Avatar URL
   * @description Override the default avatar URL for this message
   */
  avatarUrl?: string;
  
  /**
   * @title Thread Name
   * @description Create a thread with this name from the message
   */
  threadName?: string;
}

export interface DiscohookMCPFunctions {
  DISCOHOOK_SEND_MESSAGE: (
    params: MessageContent
  ) => Promise<{ success: boolean; message: string }>;
}

export type DiscohookMCP = {
  id: string;
  name: string;
  description: string;
  icon: string;
  provider: "discohook";
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
};

export const discohookMCP: DiscohookMCP = {
  id: "discohook",
  name: "Discord Webhook",
  description: "Send messages to Discord channels via webhooks",
  icon: "https://assets.deco.cx/icons/discord.svg",
  provider: "discohook",
  inputSchema: {
    type: "object",
    required: ["webhookUrl"],
    properties: {
      webhookUrl: {
        type: "string",
        title: "Webhook URL",
        description: "The Discord webhook URL",
      },
      username: {
        type: "string",
        title: "Username",
        description: "The username that will appear when sending messages",
      },
      avatarUrl: {
        type: "string",
        title: "Avatar URL",
        description: "URL for the avatar that will be displayed",
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    properties: {
      success: {
        type: "boolean",
      },
      message: {
        type: "string",
      },
    },
    additionalProperties: false,
  },
};

export async function sendMessage(
  config: DiscohookMCPConfig,
  params: MessageContent
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: params.content,
        username: params.username || config.username,
        avatar_url: params.avatarUrl || config.avatarUrl,
        thread_name: params.threadName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Failed to send message: ${response.status} ${errorText}`,
      };
    }

    return {
      success: true,
      message: "Message sent successfully",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Error sending message: ${errorMessage}`,
    };
  }
}

export function createDiscohookMCP(config: DiscohookMCPConfig): DiscohookMCPFunctions {
  return {
    DISCOHOOK_SEND_MESSAGE: (params) => sendMessage(config, params),
  };
} 