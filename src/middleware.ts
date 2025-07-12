import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// このミドルウェアは、APIルートのみを保護します
export async function middleware(request: NextRequest) {
  console.log('ミドルウェアが実行されました。パス:', request.nextUrl.pathname);
  
  // クッキーからトークンを取得する試み
  const authCookie = request.cookies.get('auth_token');
  let token = authCookie?.value;
  
  // クッキーになければ、Authorizationヘッダーをチェック
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  // APIルートのみを保護する
  if (!token) {
    // APIルートの場合は401エラーを返す
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // トークンがあればリクエストを続行
  return NextResponse.next();
}

// ミドルウェアを適用するパスを設定 - APIルートのみ
export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/timer/:path*'
  ],
};
