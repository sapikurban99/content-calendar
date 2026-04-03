import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('target'); // 'profile' or 'post'
  const body = await request.json();

  let webhookUrl = '';
  
  if (target === 'post') {
    webhookUrl = process.env.NEXT_PUBLIC_N8N_POST_WEBHOOK_URL || '';
  } else if (target === 'profile') {
    webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || '';
  }

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      return NextResponse.json({ error: 'n8n error', details: errorText }, { status: n8nResponse.status });
    }

    const data = await n8nResponse.json();
    console.log(`[Proxy] n8n response for ${target}:`, JSON.stringify(data, null, 2));
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
