import React, { useState, useEffect } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QRCodeScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [controls, setControls] = useState<IScannerControls | null>(null);

  // カメラを起動してQRコードスキャンを開始
  const startScanner = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      const codeReader = new BrowserQRCodeReader();
      
      // 利用可能なビデオデバイスを取得
      const videoDevices = await BrowserQRCodeReader.listVideoInputDevices();
      
      if (videoDevices.length === 0) {
        throw new Error('カメラが見つかりません');
      }
      
      // 背面カメラを優先的に使用
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      const deviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
      
      // ビデオ要素を取得
      const videoElement = document.getElementById('qr-video') as HTMLVideoElement;
      
      if (!videoElement) {
        throw new Error('ビデオ要素が見つかりません');
      }
      
      // QRコードスキャンを開始
      const controlsInstance = await codeReader.decodeFromVideoDevice(
        deviceId,
        videoElement,
        (result, error) => {
          if (result) {
            // QRコードが検出された
            const text = result.getText();
            if (text && text.includes('/login?qr=')) {
              const token = text.split('/login?qr=')[1];
              onScan(token);
              stopScanner();
            }
          }
          
          if (error && !(error instanceof TypeError)) {
            // TypeError以外のエラーを表示（TypeErrorはフレーム処理中の一般的なエラー）
            console.error('QRスキャンエラー:', error);
          }
        }
      );
      
      setControls(controlsInstance);
      
    } catch (err) {
      console.error('QRスキャナー初期化エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setIsScanning(false);
    }
  };

  // スキャンを停止
  const stopScanner = () => {
    if (controls) {
      controls.stop();
      setControls(null);
    }
    setIsScanning(false);
  };

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Card className="p-4 max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">QRコードをスキャン</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          {isScanning ? (
            <div className="relative">
              <video 
                id="qr-video" 
                className="w-full h-64 object-cover rounded"
                muted
                playsInline
              ></video>
              <div className="absolute inset-0 border-2 border-blue-500 opacity-50 pointer-events-none"></div>
            </div>
          ) : (
            <div className="h-64 bg-gray-100 flex items-center justify-center rounded">
              <p className="text-gray-500">カメラが起動していません</p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 justify-center">
          {!isScanning ? (
            <Button onClick={startScanner}>
              スキャン開始
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopScanner}>
              スキャン停止
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
        </div>
      </div>
    </Card>
  );
}
