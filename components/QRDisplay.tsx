import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import Image from 'next/image';

type QRDisplayProps = {
  value: string;
  size?: number;
  title?: string;
  downloadable?: boolean;
};

const QRDisplay: React.FC<QRDisplayProps> = ({
  value,
  size = 200,
  title,
  downloadable = true,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!value) return;

    const generateQR = async () => {
      setLoading(true);
      try {
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setQrUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [value, size]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${title || 'qrcode'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1 }}>
            <Image 
              src={qrUrl} 
              alt="QR Code" 
              width={size} 
              height={size}
              unoptimized // Required for data URLs
            />
          </Box>
          
          {downloadable && qrUrl && (
            <Button 
              variant="outlined" 
              onClick={handleDownload} 
              sx={{ mt: 2 }}
            >
              Download QR Code
            </Button>
          )}
        </>
      )}
    </Box>
  );
};

export default QRDisplay; 