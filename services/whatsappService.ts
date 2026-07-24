const WA_SENDER_URL = 'https://www.wasenderapi.com/api/send-message';

export interface WaSenderResponse {
  success: boolean;
  data: {
    msgId: number;
    jid: string;
    status: string;
  };
}

export interface WaSenderError {
  success: false;
  message: string;
}

export async function sendWhatsAppText(
  apiKey: string,
  to: string,
  text: string
): Promise<WaSenderResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(WA_SENDER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, text }),
    });

    const raw = await response.text();
    let data: any;
    try { data = JSON.parse(raw); } catch { throw new Error(`WaSender non-JSON response: ${raw.slice(0, 200)}`); }

    if (!response.ok) {
      throw new Error(data.message || `WaSender API error: ${response.status}`);
    }

    if (!data.success) {
      throw new Error(data.message || 'WaSender request failed');
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    } else if (cleaned.startsWith('0')) {
      cleaned = '+213' + cleaned.slice(1);
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}
