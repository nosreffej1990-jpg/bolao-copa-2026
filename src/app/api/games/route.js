import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://worldcup26.ir/get/games', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 60 } // Cache server-side for 60 seconds
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in proxy games API:', error);
    return NextResponse.json({ error: error.message, games: [] }, { status: 500 });
  }
}
