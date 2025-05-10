
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { QrCode, Upload, X } from 'lucide-react';

export const QRCreationForm = () => {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Implementation for creating QR code would go here
    console.log('Creating QR Code with:', {
      productName,
      productDescription,
      systemPrompt,
      files
    });
    
    // Reset form after submission
    setProductName('');
    setProductDescription('');
    setSystemPrompt('');
    setFiles([]);
  };

  return (
    <Card className="bg-card text-card-foreground card-shadow border-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center">
          <QrCode className="h-5 w-5 mr-2 text-iqr-200" />
          Create New QR Code
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              className="bg-secondary border-secondary"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="productDescription">Product Description</Label>
            <Textarea
              id="productDescription"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Enter product description"
              className="bg-secondary border-secondary resize-none"
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system prompt for the AI"
              className="bg-secondary border-secondary resize-none"
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fileUpload">Upload PDF Documents</Label>
            <div className="border-2 border-dashed border-iqr-100/30 rounded-lg p-4 text-center cursor-pointer hover:border-iqr-200/50 transition-colors">
              <input
                id="fileUpload"
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                <Upload className="h-10 w-10 text-iqr-300/50 mb-2" />
                <p className="text-sm text-iqr-300">
                  Click to upload or drag and drop PDF files
                </p>
                <p className="text-xs text-iqr-300/70 mt-1">
                  (PDF files only, max 10MB each)
                </p>
              </label>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>Uploaded Files</Label>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-secondary rounded-md p-2 px-3"
                  >
                    <span className="text-sm text-iqr-300 truncate max-w-[250px]">
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 shrink-0 text-iqr-300/70 hover:text-iqr-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2">
            <Button 
              type="submit" 
              className="bg-iqr-200 text-iqr-50 hover:bg-iqr-200/80 w-full sm:w-auto"
            >
              <QrCode className="mr-2 h-4 w-4" />
              Generate QR Code
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
