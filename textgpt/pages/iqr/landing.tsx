import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Paper, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText
} from '@mui/material';
import { Check as CheckIcon, QrCode as QrCodeIcon, Sms as SmsIcon, Analytics as AnalyticsIcon } from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function IQRLanding() {
  const features = [
    {
      title: 'QR Code Generation',
      description: 'Generate custom QR codes that connect directly to your SMS service.',
      icon: <QrCodeIcon color="primary" fontSize="large" />
    },
    {
      title: 'SMS Interaction',
      description: 'Let customers interact with your business through SMS powered by AI.',
      icon: <SmsIcon color="primary" fontSize="large" />
    },
    {
      title: 'Customer Analytics',
      description: 'Get insights into customer interactions and engagement.',
      icon: <AnalyticsIcon color="primary" fontSize="large" />
    }
  ];

  return (
    <div>
      <Head>
        <title>IQR - TextGPT SMS Service for Businesses</title>
        <meta name="description" content="IQR provides AI-powered SMS interaction services for general businesses" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar serviceName="IQR" />

      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'white', 
          py: 8 
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                IQR Service
              </Typography>
              <Typography variant="h5" paragraph>
                AI-Powered SMS Communication for General Businesses
              </Typography>
              <Typography variant="body1" paragraph sx={{ mb: 4 }}>
                Enhance customer engagement with our QR-to-SMS service. Generate QR codes that
                connect customers directly to your business through SMS, powered by advanced AI.
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                component={Link} 
                href="/auth/register?service=iqr"
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  }
                }}
              >
                Get Started
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center' 
                }}
              >
                <Box 
                  component="img"
                  src="/placeholder-iqr-hero.jpg"
                  alt="IQR Service Illustration"
                  sx={{ 
                    width: '100%', 
                    maxWidth: 400,
                    height: 'auto', 
                    borderRadius: 2,
                    boxShadow: 3
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container sx={{ py: 8 }}>
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          Features
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography>
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h2" gutterBottom>
                How It Works
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Sign Up for IQR Service" 
                    secondary="Create your business account and set up your profile" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Generate QR Codes" 
                    secondary="Create custom QR codes for your business" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Display QR Codes" 
                    secondary="Place QR codes in your business, products, or marketing materials" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Customers Scan & Interact" 
                    secondary="Customers scan the QR code and interact with your business via SMS" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Monitor Analytics" 
                    secondary="Track customer engagement and get insights" 
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center' 
                }}
              >
                <Box 
                  component="img"
                  src="/placeholder-how-it-works.jpg"
                  alt="How IQR Works"
                  sx={{ 
                    width: '100%', 
                    maxWidth: 400,
                    height: 'auto', 
                    borderRadius: 2,
                    boxShadow: 3
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Footer />
    </div>
  );
} 