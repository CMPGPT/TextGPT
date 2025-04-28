import React, { useState } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

type UploadPDFProps = {
  onUploadSuccess?: (fileUrl: string, fileName: string) => void;
  onUploadError?: (error: Error) => void;
  serviceType: 'iqr' | 'kiwi';
};

const UploadPDF: React.FC<UploadPDFProps> = ({ 
  onUploadSuccess, 
  onUploadError,
  serviceType
}) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serviceType', serviceType);
      
      // API endpoint would be different depending on service type
      const response = await fetch(`/api/${serviceType}/upload-pdf`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      if (onUploadSuccess) {
        onUploadSuccess(data.fileUrl, file.name);
      }
    } catch (error) {
      if (onUploadError && error instanceof Error) {
        onUploadError(error);
      }
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="h6" gutterBottom>
        Upload PDF Document
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          disabled={uploading}
        >
          Select PDF
          <input
            type="file"
            accept=".pdf"
            hidden
            onChange={handleFileChange}
          />
        </Button>
        
        {file && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={uploading}
            sx={{ ml: 2 }}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        )}
        
        {file && (
          <Typography variant="body2" sx={{ ml: 2 }}>
            {file.name}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default UploadPDF; 