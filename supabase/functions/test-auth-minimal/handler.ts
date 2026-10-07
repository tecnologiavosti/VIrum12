
import { getGrokEndpoint, AiChatOptions } from "../_shared/ai-config.ts";

export async function testGroqAuth() {
  try {
    const grok = getGrokEndpoint();
    const payload = {
      model: grok.model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5
    };

    console.log(`[TEST-AUTH] Calling ${grok.url} with model ${grok.model}`);
    
    const response = await fetch(grok.url, {
      method: "POST",
      headers: grok.headers,
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const body = await response.text();
    
    return {
      status,
      provider: grok.provider,
      endpoint: grok.url,
      model: grok.model,
      body: body.substring(0, 200)
    };
  } catch (err) {
    return {
      status: "EXCEPTION",
      error: err.message
    };
  }
}
