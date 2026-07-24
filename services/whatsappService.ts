const WA_SENDER_URL = 'https://wasenderapi.com/api/send-message';

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
  const response = await fetch(WA_SENDER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `WaSender API error: ${response.status}`);
  }

  if (!data.success) {
    throw new Error(data.message || 'WaSender request failed');
  }

  return data;
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
