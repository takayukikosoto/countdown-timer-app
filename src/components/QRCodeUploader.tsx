import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BrowserQRCodeReader } from '@zxing/browser';

interface QRCodeUploaderProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

export default function QRCodeUploader({ onScan, onClose }: QRCodeUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // QRコード画像をアップロードして解析
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルかどうかを確認
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // 画像のプレビューを表示
      const imageUrl = URL.createObjectURL(file);
      setPreviewUrl(imageUrl);

      // QRコードリーダーを初期化
      const codeReader = new BrowserQRCodeReader();

      // 画像からQRコードを解析
      const img = new Image();
      img.src = imageUrl;
      
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      // キャンバスを作成して画像を描画
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('キャンバスの初期化に失敗しました');
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // キャンバスからImageDataを取得
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // QRコードを解析
      try {
        const result = await codeReader.decodeFromImageUrl(imageUrl);
        const text = result.getText();
        
        if (text) {
          if (text.includes('/login?qr=') || text.includes('/login?token=')) {
            // URLからトークンを抽出
            const token = text.includes('/login?qr=') 
              ? text.split('/login?qr=')[1] 
              : text.includes('/login?token=') 
                ? text.split('/login?token=')[1]
                : text;
                
            onScan(token);
          } else {
            // トークンそのものの場合
            onScan(text);
          }
        } else {
          throw new Error('QRコードが検出できませんでした');
        }
      } catch (decodeError) {
        console.error('QRコード解析エラー:', decodeError);
        setError('QRコードの読み取りに失敗しました。別の画像を試してください。');
      }
    } catch (err) {
      console.error('QRコード処理エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // プレビューのクリーンアップ
  const resetUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
  };

  return (
    <Card className="p-4 max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">QRコード画像をアップロード</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          {previewUrl ? (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="QRコードプレビュー" 
                className="w-full max-h-64 object-contain rounded"
              />
            </div>
          ) : (
            <div className="h-64 bg-gray-100 flex flex-col items-center justify-center rounded p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 mb-2">QRコード画像をアップロード</p>
              <p className="text-gray-400 text-xs">PNG, JPG, GIF形式</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-2">
          <label className="w-full">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            <Button 
              type="button" 
              className="w-full" 
              disabled={isProcessing}
              variant={previewUrl ? "outline" : "default"}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  処理中...
                </div>
              ) : previewUrl ? (
                '別の画像を選択'
              ) : (
                '画像を選択'
              )}
            </Button>
          </label>
          
          <div className="flex space-x-2 justify-center">
            {previewUrl && (
              <Button variant="destructive" onClick={resetUpload} disabled={isProcessing}>
                リセット
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              キャンセル
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
