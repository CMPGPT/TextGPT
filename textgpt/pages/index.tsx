import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Container, Typography, Grid, Card, CardContent, CardActionArea, CardMedia, Box, Button } from '@mui/material';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div>
      <Head>
        <title>TextGPT - AI-Powered SMS Services</title>
        <meta name="description" content="TextGPT provides AI-powered SMS interaction services for businesses" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      <Container component="main" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to TextGPT
          </Typography>
          <Typography variant="h5" component="p" color="text.secondary" sx={{ mb: 4 }}>
            AI-Powered SMS Communication for Businesses
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardActionArea component={Link} href="/iqr/landing">
                <CardMedia
                  component="img"
                  height="200"
                  image="/placeholder-iqr.jpg"
                  alt="IQR Service"
                  sx={{ bgcolor: 'primary.light' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    IQR for General Businesses
                  </Typography>
                  <Typography>
                    Enhance customer interactions with our general business service. 
                    Create QR codes that connect directly to SMS, allowing customers to 
                    interact with your business easily.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardActionArea component={Link} href="/kiwi/landing">
                <CardMedia
                  component="img"
                  height="200"
                  image="/placeholder-kiwi.jpg"
                  alt="Kiwi Service"
                  sx={{ bgcolor: 'secondary.light' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2">
                    Kiwi for Real Estate
                  </Typography>
                  <Typography>
                    Specialized service for real estate professionals. Generate QR codes for 
                    properties that connect potential buyers or renters to your SMS service.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button variant="contained" size="large" component={Link} href="/auth/login">
            Get Started
          </Button>
        </Box>
      </Container>

      <Footer />
    </div>
  );
} 