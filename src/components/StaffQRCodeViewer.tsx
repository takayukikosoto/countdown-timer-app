import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StaffQRCodeViewerProps {
  displayName: string;
}

export default function StaffQRCodeViewer({ displayName }: StaffQRCodeViewerProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [qrLoginUrl, setQrLoginUrl] = useState<string | null>(null);

  // QRコードトークンを取得する関数
  const fetchQRToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // APIを呼び出してトークンを取得
      const response = await fetch('/api/staff/qr-token');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'QRコードの取得に失敗しました');
      }
      
      const data = await response.json();
      setQrToken(data.token);
      setUsername(data.username || '');
      setQrLoginUrl(data.token);
      setShowQR(true);
    } catch (error) {
      console.error('QRコード取得エラー:', error);
      setError(error instanceof Error ? error.message : 'QRコードの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // QRコードを印刷する関数
  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${displayName} - ログインQRコード</title>
          <style>
            body {
              font-family: sans-serif;
              text-align: center;
              padding: 20px;
            }
            .qr-container {
              margin: 20px auto;
              max-width: 300px;
            }
            .staff-info {
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="staff-info">
            <h2>${displayName}</h2>
            <p>ユーザーID: ${username}</p>
            <p>ログインURL: <a href="${qrLoginUrl}">${qrLoginUrl}</a></p>
          </div>
          <div class="qr-container">
            ${document.getElementById('staff-qr-code-svg')?.outerHTML || ''}
          </div>
          <p>このQRコードをスキャンするか、URLをクリックするとログインできます</p>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="mt-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {!showQR ? (
        <Button 
          onClick={fetchQRToken} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'QRコード取得中...' : '自分のログインQRコードを表示'}
        </Button>
      ) : (
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">あなたのログインQRコード</h3>
            <p className="text-sm mb-2">ユーザーID: <span className="font-medium">{username}</span></p>
            {qrLoginUrl && (
              <p className="text-sm mb-4">
                ログインURL: <a href={qrLoginUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{qrLoginUrl}</a>
              </p>
            )}
            <div className="flex justify-center mb-4" id="staff-qr-code-container">
              <div id="staff-qr-code-svg">
                <QRCodeSVG 
                  value={qrToken || ''} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                />
              </div>
            </div>
            <div className="flex space-x-2 justify-center">
              <Button onClick={printQRCode}>
                印刷
              </Button>
              <Button variant="outline" onClick={() => setShowQR(false)}>
                閉じる
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
