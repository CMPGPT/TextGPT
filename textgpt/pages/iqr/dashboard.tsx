import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Card, 
  CardContent,
  Button,
  Divider
} from '@mui/material';
import { 
  QrCode as QrCodeIcon, 
  PictureAsPdf as PdfIcon, 
  Message as MessageIcon, 
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import QRDisplay from '@/components/QRDisplay';
import UploadPDF from '@/components/UploadPDF';
import AnalyticsChart from '@/components/AnalyticsChart';
import { useAuthState } from '@/utils/auth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function IQRDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [qrCodes, setQrCodes] = useState<{id: string; name: string; value: string}[]>([]);
  const { user, loading, userRole } = useAuthState();
  const router = useRouter();

  // Mock data for analytics
  const analyticsData = [
    { name: 'Jan', scans: 40, interactions: 24, conversions: 12 },
    { name: 'Feb', scans: 30, interactions: 18, conversions: 9 },
    { name: 'Mar', scans: 20, interactions: 10, conversions: 5 },
    { name: 'Apr', scans: 27, interactions: 15, conversions: 8 },
    { name: 'May', scans: 18, interactions: 12, conversions: 6 },
    { name: 'Jun', scans: 23, interactions: 14, conversions: 7 },
    { name: 'Jul', scans: 34, interactions: 20, conversions: 10 },
  ];

  useEffect(() => {
    // Check authentication and redirect if not logged in
    if (!loading && !user) {
      router.push('/auth/login');
    }

    // Mock data for QR codes
    setQrCodes([
      { id: '1', name: 'Store Front', value: 'https://textgpt.com/iqr/1234' },
      { id: '2', name: 'Product Package', value: 'https://textgpt.com/iqr/5678' },
      { id: '3', name: 'Business Card', value: 'https://textgpt.com/iqr/9012' },
    ]);
  }, [loading, user, router]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGenerateQR = () => {
    // This would open a modal or form to generate a new QR code
    console.log('Generate new QR code');
  };

  const handleUploadSuccess = (fileUrl: string, fileName: string) => {
    console.log('PDF uploaded successfully:', fileUrl, fileName);
    // This would update the UI to show the uploaded PDF or trigger a notification
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Head>
        <title>IQR Dashboard - TextGPT</title>
        <meta name="description" content="IQR business dashboard for managing SMS services" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar serviceName="IQR" isLoggedIn={!!user} />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          IQR Business Dashboard
        </Typography>
        
        <Paper sx={{ mt: 3, mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab icon={<DashboardIcon />} label="Overview" />
            <Tab icon={<QrCodeIcon />} label="QR Codes" />
            <Tab icon={<MessageIcon />} label="Messages" />
            <Tab icon={<PdfIcon />} label="PDF Upload" />
          </Tabs>

          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total QR Scans
                    </Typography>
                    <Typography variant="h5" component="div">
                      192
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      SMS Interactions
                    </Typography>
                    <Typography variant="h5" component="div">
                      113
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      QR Codes Created
                    </Typography>
                    <Typography variant="h5" component="div">
                      {qrCodes.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6} lg={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Conversion Rate
                    </Typography>
                    <Typography variant="h5" component="div">
                      31%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <AnalyticsChart 
                  title="Monthly Activity" 
                  data={analyticsData} 
                  type="line" 
                  dataKeys={['scans', 'interactions', 'conversions']} 
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* QR Codes Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<QrCodeIcon />}
                onClick={handleGenerateQR}
              >
                Generate New QR Code
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              {qrCodes.map((qrCode) => (
                <Grid item xs={12} md={4} key={qrCode.id}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <QRDisplay 
                      value={qrCode.value} 
                      title={qrCode.name} 
                      downloadable 
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Messages Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Recent SMS Interactions
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                This tab would display recent customer interactions via SMS, allowing businesses to 
                view message history and analytics.
              </Typography>
            </Paper>
          </TabPanel>

          {/* PDF Upload Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Upload PDF Documents
            </Typography>
            <Paper sx={{ p: 2 }}>
              <UploadPDF 
                serviceType="iqr" 
                onUploadSuccess={handleUploadSuccess} 
              />
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                Uploaded Documents
              </Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                Previously uploaded documents would appear here.
              </Typography>
            </Paper>
          </TabPanel>
        </Paper>
      </Container>

      <Footer />
    </div>
  );
} 