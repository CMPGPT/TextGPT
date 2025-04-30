import React, { useState } from 'react';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

// Using these props in component even though ESLint doesn't recognize it
/* eslint-disable no-unused-vars */
type UploadPDFProps = {
  onUploadSuccess?: (fileUrl: string, fileName: string) => void;
  onUploadError?: (error: Error) => void;
  serviceType: 'iqr' | 'kiwi';
};
/* eslint-enable no-unused-vars */

const UploadPDF: React.FC<UploadPDFProps> = ({ 
  onUploadSuccess = () => {}, 
  onUploadError = () => {},
  serviceType
}) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  // Variables below are used in the UI but ESLint doesn't recognize it
  /* eslint-disable no-unused-vars */
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  /* eslint-enable no-unused-vars */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    
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
      setFileUrl(data.fileUrl);
      
      onUploadSuccess(data.fileUrl, fileName);
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(uploadError);
      onUploadError(uploadError);
      console.error('Error uploading file:', uploadError);
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
            {fileName}
          </Typography>
        )}
      </Box>
      
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error: {error.message}
        </Typography>
      )}
      
      {fileUrl && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          Upload successful! File available at: {fileUrl}
        </Typography>
      )}
    </Box>
  );
};

export default UploadPDF; 