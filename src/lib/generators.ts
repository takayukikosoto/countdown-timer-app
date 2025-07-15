/**
 * ランダムなユーザー名を生成する関数
 * 形式: user_XXXXX（Xは数字）
 */
export function generateUsername(): string {
  // 5桁のランダムな数字を生成
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `user_${randomNum}`;
}

/**
 * ランダムなパスワードを生成する関数
 * 8文字の英数字をランダムに組み合わせる
 */
export function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  // 少なくとも1つの数字を含める
  password += '0123456789'.charAt(Math.floor(Math.random() * 10));
  
  // 少なくとも1つの大文字を含める
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));
  
  // 少なくとも1つの小文字を含める
  password += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26));
  
  // 残りの文字をランダムに生成
  for (let i = 0; i < 5; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 文字列をシャッフル
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * QRコードのトークンを生成する関数
 */
export function generateQRToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  // 32文字のランダムな文字列を生成
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return token;
}
