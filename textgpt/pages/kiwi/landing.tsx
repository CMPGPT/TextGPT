import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Grid, 
  Card,
  CardContent,
  CardMedia,
  Stack,
  Divider,
  Avatar,
  Chip
} from '@mui/material';
import { 
  QrCode2 as QrCodeIcon, 
  Chat as ChatIcon, 
  BarChart as AnalyticsIcon,
  TouchApp as TouchIcon, 
  Speed as SpeedIcon,
  Security as SecurityIcon 
} from '@mui/icons-material';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// NOTE: Please add these placeholder images to your public directory:
// - /placeholder-kiwi-hero.jpg

// Kiwi-specific theme colors
const kiwiColors = {
  primary: '#4CAF50', // Green
  secondary: '#8BC34A', // Light Green
  accent: '#CDDC39', // Lime
  text: '#33691E', // Dark Green
  background: '#F9FBE7', // Very Light Yellow-Green
};

export default function KiwiLanding() {
  const features = [
    {
      title: 'Interactive QR Code',
      description: 'Generate smart QR codes specifically designed for retail products',
      icon: <QrCodeIcon sx={{ fontSize: 40, color: kiwiColors.primary }} />,
      color: kiwiColors.accent
    },
    {
      title: 'Smart Product Interactions',
      description: 'Enable customers to interact directly with your products',
      icon: <ChatIcon sx={{ fontSize: 40, color: kiwiColors.primary }} />,
      color: kiwiColors.accent
    },
    {
      title: 'Retail Analytics',
      description: 'Gain insights into product engagement and customer behavior',
      icon: <AnalyticsIcon sx={{ fontSize: 40, color: kiwiColors.primary }} />,
      color: kiwiColors.accent
    }
  ];

  const benefits = [
    {
      title: 'Increase Engagement',
      description: 'Boost product interaction and customer engagement by up to 40%',
      icon: <TouchIcon />
    },
    {
      title: 'Quick Implementation',
      description: 'Set up in minutes with our simple integration process',
      icon: <SpeedIcon />
    },
    {
      title: 'Secure & Private',
      description: 'Enterprise-grade security for all customer interactions',
      icon: <SecurityIcon />
    }
  ];

  return (
    <Box sx={{ bgcolor: kiwiColors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>KIWI - Smart Retail QR System</title>
        <meta name="description" content="KIWI provides smart QR code solutions for retail products" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar serviceName="Kiwi" />

      {/* Hero Section - Updated style */}
      <Box 
        sx={{ 
          background: `linear-gradient(120deg, ${kiwiColors.primary} 0%, ${kiwiColors.secondary} 100%)`,
          color: 'white',
          py: { xs: 6, md: 10 },
          borderRadius: { md: '0 0 50px 0' },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} sx={{ zIndex: 1 }}>
              <Typography 
                variant="h2" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 800,
                  textShadow: '1px 1px 3px rgba(0,0,0,0.2)'
                }}
              >
                KIWI Retail
              </Typography>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 400 }}>
                Smart QR Codes for Retail Products
              </Typography>
              <Typography variant="body1" sx={{ mb: 4, maxWidth: 500 }}>
                Transform your retail products into interactive experiences. KIWI QR codes connect 
                customers directly to product information, reviews, and support - all through their smartphones.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="contained" 
                  size="large" 
                  component={Link} 
                  href="/auth/register?service=kiwi"
                  sx={{ 
                    bgcolor: 'white', 
                    color: kiwiColors.primary,
                    fontWeight: 'bold',
                    '&:hover': {
                      bgcolor: '#f0f0f0',
                    },
                    px: 4,
                    py: 1.5,
                    borderRadius: 3
                  }}
                >
                  Get Started
                </Button>
                <Button 
                  variant="outlined" 
                  size="large" 
                  component={Link} 
                  href="#demo"
                  sx={{ 
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    },
                    px: 3,
                    py: 1.5,
                    borderRadius: 3
                  }}
                >
                  Watch Demo
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ position: 'relative' }}>
              <Box 
                sx={{ 
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex', 
                  justifyContent: 'center',
                  p: 2
                }}
              >
                <Box 
                  component="img"
                  src="/placeholder-kiwi-hero.jpg"
                  alt="KIWI Smart Retail QR"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzRDQUY1MCIgLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+S0lXSSBTbWFydCBSZXRhaWw8L3RleHQ+PC9zdmc+';
                  }}
                  sx={{ 
                    width: '100%', 
                    maxWidth: 450,
                    height: 'auto', 
                    borderRadius: 4,
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    transform: { md: 'rotate(2deg)' },
                    border: '5px solid white'
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
        
        {/* Decorative elements */}
        <Box sx={{ 
          position: 'absolute', 
          width: 300, 
          height: 300, 
          borderRadius: '50%', 
          bgcolor: 'rgba(255,255,255,0.1)', 
          top: -50, 
          right: -100,
          zIndex: 0
        }} />
        <Box sx={{ 
          position: 'absolute', 
          width: 200, 
          height: 200, 
          borderRadius: '50%', 
          bgcolor: 'rgba(255,255,255,0.1)', 
          bottom: -50, 
          left: -50,
          zIndex: 0
        }} />
      </Box>

      {/* Stats Section */}
      <Container maxWidth="lg" sx={{ py: 6, mt: { xs: 0, md: -5 }, zIndex: 2, position: 'relative' }}>
        <Card elevation={6} sx={{ borderRadius: 4 }}>
          <Grid container>
            {['200+ Retailers', '15M+ Scans', '40% Engagement Increase'].map((stat, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} md={4} sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: kiwiColors.text }}>
                    {stat}
                  </Typography>
                </Grid>
                {index < 2 && (
                  <Grid item xs={0} md={0} sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Divider orientation="vertical" flexItem />
                  </Grid>
                )}
              </React.Fragment>
            ))}
          </Grid>
        </Card>
      </Container>

      {/* Features Section - Card-based layout */}
      <Container sx={{ py: 6 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ 
            fontWeight: 700, 
            color: kiwiColors.text,
            mb: 6
          }}
        >
          Transform Your Retail Experience
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 3,
                  transition: '0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  },
                  overflow: 'visible'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mt: -3
                }}>
                  <Avatar 
                    sx={{ 
                      width: 70, 
                      height: 70, 
                      bgcolor: 'white',
                      boxShadow: 2
                    }}
                  >
                    {feature.icon}
                  </Avatar>
                </Box>
                <CardContent sx={{ textAlign: 'center', pt: 3 }}>
                  <Typography 
                    variant="h5" 
                    component="h3" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 600,
                      color: kiwiColors.text
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary' }}>
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How It Works - Timeline style */}
      <Box sx={{ bgcolor: 'white', py: 8 }}>
        <Container>
          <Typography 
            variant="h3" 
            component="h2" 
            align="center" 
            gutterBottom
            sx={{ 
              fontWeight: 700, 
              color: kiwiColors.text,
              mb: 6
            }}
          >
            How KIWI Works
          </Typography>
          
          <Box sx={{ position: 'relative', pb: 4 }}>
            {/* Timeline line */}
            <Box sx={{ 
              position: 'absolute',
              left: { xs: 'calc(50% - 1px)', md: 100 },
              top: 0,
              bottom: 0,
              width: 2,
              bgcolor: kiwiColors.secondary,
              zIndex: 0
            }} />
            
            {/* Timeline steps */}
            {[
              { title: 'Create Account', desc: 'Sign up for KIWI and set up your retail profile' },
              { title: 'Generate QR Codes', desc: 'Create custom QR codes for your products' },
              { title: 'Integrate with Products', desc: 'Add QR codes to packaging or price tags' },
              { title: 'Customers Interact', desc: 'Shoppers scan codes to learn about products' },
              { title: 'Analyze & Optimize', desc: 'Use insights to improve product performance' }
            ].map((step, index) => (
              <Box 
                key={index}
                sx={{ 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  mb: 5,
                  flexDirection: { xs: 'column', md: 'row' },
                  pl: { md: 6 }
                }}
              >
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%',
                  bgcolor: kiwiColors.primary,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  zIndex: 1,
                  position: 'absolute',
                  left: { xs: 'calc(50% - 20px)', md: 80 },
                  boxShadow: 2
                }}>
                  {index + 1}
                </Box>
                
                <Card 
                  sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    width: '100%',
                    boxShadow: 2,
                    ml: { md: 4 }
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: kiwiColors.text }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {step.desc}
                  </Typography>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ 
        bgcolor: kiwiColors.primary, 
        color: 'white', 
        py: 8,
        borderRadius: { md: '50px 0 0 0' }
      }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, fontWeight: 400 }}>
            Join hundreds of retailers already using KIWI
          </Typography>
          <Button 
            variant="contained" 
            size="large" 
            component={Link} 
            href="/auth/register?service=kiwi"
            sx={{ 
              bgcolor: 'white', 
              color: kiwiColors.primary,
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: '#f0f0f0',
              },
              px: 5,
              py: 1.5,
              borderRadius: 3,
              fontSize: '1.1rem'
            }}
          >
            Sign Up Now
          </Button>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
} 