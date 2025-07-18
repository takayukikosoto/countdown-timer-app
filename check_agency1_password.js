const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAgency1Password() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username, password, display_name, role')
      .eq('username', 'agency1')
      .single();

    if (error) {
      console.error('エラー:', error);
      return;
    }

    if (data) {
      console.log('agency1 の情報:');
      console.log('ユーザー名:', data.username);
      console.log('表示名:', data.display_name);
      console.log('ロール:', data.role);
      console.log('パスワード（ハッシュ化済み）:', data.password);
      
      // パスワードがハッシュ化されている場合、元のパスワードは復元できません
      console.log('\n注意: パスワードはハッシュ化されているため、元のパスワードは表示できません。');
      console.log('新しいパスワードを設定する必要がある場合は、管理画面から変更してください。');
    } else {
      console.log('agency1 ユーザーが見つかりません');
    }
  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

checkAgency1Password();
