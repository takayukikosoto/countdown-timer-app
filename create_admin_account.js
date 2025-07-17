const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// 環境変数から設定を読み込む
require('dotenv').config({ path: '.env.local' });

// Supabase接続情報
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 管理者アカウント情報
const username = 'admin_master';
const password = 'Master2025!';
const displayName = 'マスター管理者';
const role = 'admin';

async function createAdminUser() {
  console.log('Supabase URL:', supabaseUrl);
  console.log('管理者アカウントを作成します...');
  
  // Supabaseクライアントを初期化
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // パスワードをハッシュ化
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 既存のユーザーをチェック
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .single();
      
    if (existingUser) {
      console.log(`ユーザー ${username} は既に存在します。更新します...`);
      
      // 既存ユーザーを更新
      const { data, error } = await supabase
        .from('admin_users')
        .update({
          password_hash: passwordHash,
          display_name: displayName,
          role: role,
          updated_at: new Date()
        })
        .eq('username', username)
        .select('id, username, display_name, role')
        .single();
        
      if (error) {
        console.error('ユーザー更新エラー:', error);
        return;
      }
      
      console.log('ユーザーを更新しました:', data);
    } else {
      // 新規ユーザーを作成
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          username,
          password_hash: passwordHash,
          display_name: displayName,
          role,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select('id, username, display_name, role')
        .single();
        
      if (error) {
        console.error('ユーザー作成エラー:', error);
        return;
      }
      
      console.log('新しい管理者アカウントを作成しました:', data);
    }
    
    console.log('\n=== 管理者アカウント情報 ===');
    console.log(`ユーザー名: ${username}`);
    console.log(`パスワード: ${password}`);
    console.log(`表示名: ${displayName}`);
    console.log(`ロール: ${role}`);
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

createAdminUser();
