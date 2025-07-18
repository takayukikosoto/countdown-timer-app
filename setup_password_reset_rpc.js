const { createClient } = require('@supabase/supabase-js');

// Supabase接続設定（ローカル開発環境）
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// RPC関数を作成するSQL
const createRpcFunction = `
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id INTEGER,
  p_new_password TEXT
)
RETURNS TABLE(
  id INTEGER,
  username TEXT,
  display_name TEXT,
  role TEXT,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- ユーザーの存在確認
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_user_id) THEN
    RETURN;
  END IF;

  -- パスワードをハッシュ化して更新
  UPDATE users 
  SET 
    password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE users.id = p_user_id;

  -- 更新されたユーザー情報を返す
  RETURN QUERY
  SELECT 
    users.id,
    users.username,
    users.display_name,
    users.role,
    users.updated_at
  FROM users
  WHERE users.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function setupPasswordResetRpc() {
  try {
    console.log('RPC関数を作成しています...');
    
    // SQLを直接実行
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: createRpcFunction
    });
    
    if (error) {
      console.error('RPC関数の作成に失敗しました:', error);
      
      // 代替方法: 直接SQLを実行
      console.log('代替方法でRPC関数を作成しています...');
      const { data: result, error: sqlError } = await supabase
        .from('_supabase_admin')
        .select('*')
        .limit(1);
      
      if (sqlError) {
        console.error('Supabase接続エラー:', sqlError);
        return;
      }
      
      console.log('Supabase接続は正常です。手動でRPC関数を作成してください。');
      console.log('以下のSQLをSupabase SQL Editorで実行してください:');
      console.log(createRpcFunction);
      return;
    }
    
    console.log('RPC関数が正常に作成されました:', data);
    
    // テスト実行
    console.log('RPC関数をテストしています...');
    const { data: testData, error: testError } = await supabase.rpc('update_user_password', {
      p_user_id: 999999, // 存在しないユーザーIDでテスト
      p_new_password: 'test123'
    });
    
    if (testError) {
      console.error('RPC関数のテストでエラーが発生しました:', testError);
    } else {
      console.log('RPC関数のテスト結果:', testData);
      console.log('RPC関数が正常に動作しています！');
    }
    
  } catch (error) {
    console.error('予期しないエラーが発生しました:', error);
  }
}

// 実行
setupPasswordResetRpc();
