import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

// Authentication result type definition
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
 * Get JWT token from request and verify it
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get('auth_token')?.value;
    
    // If no token in cookie, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
    
    // If no token found
    if (!token) {
      return { 
        success: false, 
        error: 'No token found' 
      };
    }
    
    // Verify token
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
    console.error('Authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication failed' 
    };
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(user: { role: string } | undefined, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Generate JWT token
 */
export async function createJWT(userData: { id: string; username: string; role: string }) {
  return jwt.sign(
    {
      user_id: userData.id,
      username: userData.username,
      role: userData.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Valid for 7 days
  );
}
