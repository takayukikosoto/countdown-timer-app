import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// ------------------------------------------------------------------
//  Login API (simplified)
//   • Authenticates via Supabase RPC `check_user_password`
//   • Returns JWT issued by the RPC (generated in Postgres)
//   • Dev mode fallback for admin/staff default users
// ------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const DEBUG = process.env.NODE_ENV !== 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

type UserInfo = {
  id: string;
  username: string;
  role: string;
};

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // --------------------------------------------------------------
    //  dev fallback user (for local development only)
    // --------------------------------------------------------------
    if (
      DEBUG &&
      ((username === 'admin' && password === 'admin123') || (username === 'staff' && password === 'staff456'))
    ) {
      const role = username === 'admin' ? 'admin' : 'staff';
      const token = jwt.sign(
        {
          user_id: username,
          username,
          role,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
        },
        JWT_SECRET
      );

      return buildResponse(token, { id: username, username, role });
    }

    // --------------------------------------------------------------
    //  call Supabase RPC for real authentication
    // --------------------------------------------------------------
    const { data, error } = await supabase.rpc('check_user_password', { p_username: username, p_password: password });

    if (error) {
      console.error('[login] RPC error', error?.message || error);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const { id, username: uname, role, token } = data[0] as {
      id: string;
      username: string;
      role: string;
      token: string;
    };

    return buildResponse(token, { id, username: uname, role });
  } catch (err) {
    console.error('[login] exception', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function buildResponse(token: string, user: UserInfo) {
  const res = NextResponse.json({
    session: {
      user: {
        id: user.id,
        user_metadata: { name: user.username, role: user.role },
      },
      access_token: token,
    },
    user,
  });

  res.cookies.set({
    name: 'auth_token',
    value: token,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24h
  });

  return res;
}
