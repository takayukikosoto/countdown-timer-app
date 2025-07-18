const bcrypt = require('bcrypt');

// 管理者アカウント情報
const username = 'admin_master';
const password = 'Master2025!';
const display_name = 'マスター管理者';
const role = 'admin';

// パスワードハッシュ生成
const saltRounds = 10;
bcrypt.hash(password, saltRounds).then(hash => {
  console.log('-- 管理者アカウント作成用SQL --');
  console.log(`INSERT INTO admin_users (username, password_hash, display_name, role, created_at, updated_at)`);
  console.log(`VALUES ('${username}', '${hash}', '${display_name}', '${role}', NOW(), NOW());`);
  console.log('\n-- アカウント情報 --');
  console.log(`ユーザー名: ${username}`);
  console.log(`パスワード: ${password}`);
});
