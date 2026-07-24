import { supabase } from '../lib/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const FUNCTION_URL = `${supabaseUrl}/functions/v1/wa-proxy`;

export interface WaSenderResponse {
  success: boolean;
  data: {
    msgId: number;
    jid: string;
    status: string;
  };
}

export async function sendWhatsAppText(
  apiKey: string,
  to: string,
  text: string
): Promise<WaSenderResponse> {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey, to, text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Proxy error: ${response.status}`);
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
