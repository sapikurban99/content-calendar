import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('target'); // 'profile' or 'post'
  const platform = searchParams.get('platform') || 'tiktok'; // tiktok, instagram, linkedin
  const body = await request.json();

  let webhookUrl = '';
  
  if (target === 'post') {
    if (platform === 'tiktok') webhookUrl = process.env.NEXT_PUBLIC_N8N_TIKTOK_POST_URL || '';
    else if (platform === 'instagram') webhookUrl = process.env.NEXT_PUBLIC_N8N_INSTAGRAM_POST_URL || '';
    else if (platform === 'linkedin') webhookUrl = process.env.NEXT_PUBLIC_N8N_LINKEDIN_POST_URL || '';
  } else if (target === 'profile') {
    if (platform === 'tiktok') webhookUrl = process.env.NEXT_PUBLIC_N8N_TIKTOK_PROFILE_URL || '';
    else if (platform === 'instagram') webhookUrl = process.env.NEXT_PUBLIC_N8N_INSTAGRAM_PROFILE_URL || '';
    else if (platform === 'linkedin') webhookUrl = process.env.NEXT_PUBLIC_N8N_LINKEDIN_PROFILE_URL || '';
  }

  if (!webhookUrl) {
    console.error(`[Proxy Error] No webhook URL found for target: ${target}, platform: ${platform}`);
    return NextResponse.json({ error: 'Webhook URL not configured' }, { status: 500 });
  }

  console.log(`[Proxy] Forwarding ${target} sync to: ${webhookUrl}`);

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(`[Proxy] n8n responded with error ${n8nResponse.status}:`, errorText);
      return NextResponse.json({ error: 'n8n error', status: n8nResponse.status, details: errorText }, { status: n8nResponse.status });
    }

    const data = await n8nResponse.json();
    console.log(`[Proxy] n8n success for ${target}`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Proxy Critical Error]:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message,
      targetUrl: webhookUrl 
    }, { status: 500 });
  }
}
