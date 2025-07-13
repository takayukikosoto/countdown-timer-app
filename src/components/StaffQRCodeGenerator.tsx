import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StaffQRCodeGeneratorProps {
  staffId: string;
  username: string;
  displayName: string;
}

export default function StaffQRCodeGenerator({ staffId, username, displayName }: StaffQRCodeGeneratorProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // QRコードトークンを生成する関数
  const generateQRToken = async () => {
    try {
      setIsGenerating(true);
      
      // APIを呼び出してトークンを生成
      const response = await fetch('/api/admin/staff/qr-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ staffId }),
      });
      
      if (!response.ok) {
        throw new Error('QRコードトークンの生成に失敗しました');
      }
      
      const data = await response.json();
      setQrToken(data.token);
      setShowQR(true);
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      alert('QRコードの生成に失敗しました');
    } finally {
      setIsGenerating(false);
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
          </div>
          <div class="qr-container">
            ${document.getElementById('qr-code-svg')?.outerHTML || ''}
          </div>
          <p>このQRコードをスキャンするとログインできます</p>
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
      {!showQR ? (
        <Button 
          onClick={generateQRToken} 
          disabled={isGenerating}
        >
          {isGenerating ? 'QRコード生成中...' : 'ログインQRコードを生成'}
        </Button>
      ) : (
        <Card className="p-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{displayName}のログインQRコード</h3>
            <div className="flex justify-center mb-4" id="qr-code-container">
              <div id="qr-code-svg">
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
