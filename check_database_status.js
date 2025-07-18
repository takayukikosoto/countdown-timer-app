const { createClient } = require('@supabase/supabase-js');

// Supabase接続設定（ローカル開発環境）
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStatus() {
  try {
    console.log('データベースの状態を確認しています...');
    
    // admin_usersテーブルの存在確認
    console.log('\n1. admin_usersテーブルの確認:');
    const { data: adminUsers, error: adminUsersError } = await supabase
      .from('admin_users')
      .select('*')
      .limit(5);
    
    if (adminUsersError) {
      console.log('❌ admin_usersテーブルが存在しないか、エラーが発生しました:', adminUsersError.message);
    } else {
      console.log('✅ admin_usersテーブルが存在します');
      console.log('レコード数:', adminUsers.length);
      if (adminUsers.length > 0) {
        console.log('カラム:', Object.keys(adminUsers[0]));
      }
    }
    
    // usersテーブルの存在確認
    console.log('\n2. usersテーブル（ビュー）の確認:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ usersテーブル/ビューが存在しないか、エラーが発生しました:', usersError.message);
    } else {
      console.log('✅ usersテーブル/ビューが存在します');
      console.log('レコード数:', users.length);
      if (users.length > 0) {
        console.log('カラム:', Object.keys(users[0]));
      }
    }
    
    // RPC関数の存在確認
    console.log('\n3. RPC関数の確認:');
    
    // check_user_password関数のテスト
    try {
      const { data: checkResult, error: checkError } = await supabase.rpc('check_user_password', {
        p_username: 'test_nonexistent_user',
        p_password: 'test123'
      });
      
      if (checkError) {
        console.log('❌ check_user_password関数が存在しないか、エラーが発生しました:', checkError.message);
      } else {
        console.log('✅ check_user_password関数が存在します');
      }
    } catch (error) {
      console.log('❌ check_user_password関数のテストでエラー:', error.message);
    }
    
    // update_user_password関数のテスト
    try {
      const { data: updateResult, error: updateError } = await supabase.rpc('update_user_password', {
        p_user_id: 999999,
        p_new_password: 'test123'
      });
      
      if (updateError) {
        console.log('❌ update_user_password関数が存在しないか、エラーが発生しました:', updateError.message);
      } else {
        console.log('✅ update_user_password関数が存在します');
      }
    } catch (error) {
      console.log('❌ update_user_password関数のテストでエラー:', error.message);
    }
    
    console.log('\n=== データベース状態確認完了 ===');
    
  } catch (error) {
    console.error('予期しないエラーが発生しました:', error);
  }
}

// 実行
checkDatabaseStatus();
