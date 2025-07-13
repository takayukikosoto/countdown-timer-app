import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// JWTシークレットキー
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

// 認証結果の型定義
export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
  };
  error?: string;
}

/**
 * リクエストからJWTトークンを取得して検証する
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // クッキーからトークンを取得
    const token = request.cookies.get('auth_token')?.value;
    
    // トークンがない場合
    if (!token) {
      return { 
        success: false, 
        error: 'トークンがありません' 
      };
    }
    
    // トークンを検証
    const decoded = jwt.verify(token, JWT_SECRET) as {
      user_id: string;
      username: string;
      role: string;
    };
    
    return {
      success: true,
      user: {
        id: decoded.user_id,
        username: decoded.username,
        role: decoded.role
      }
    };
    
  } catch (error) {
    console.error('認証エラー:', error);
    return { 
      success: false, 
      error: '認証に失敗しました' 
    };
  }
}

/**
 * ユーザーが特定のロールを持っているか確認する
 */
export function hasRole(user: { role: string } | undefined, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * JWTトークンを生成する
 */
export async function createJWT(userData: { id: string; username: string; role: string }) {
  return jwt.sign(
    {
      user_id: userData.id,
      username: userData.username,
      role: userData.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // 7日間有効
  );
}
