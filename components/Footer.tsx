import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer: React.FC = () => {
  return (
    <Box component="footer" sx={{ py: 3, mt: 'auto', bgcolor: 'primary.main', color: 'white' }}>
      <Container maxWidth="lg">
        <Typography variant="body1" align="center">
          © {new Date().getFullYear()} TextGPT. All rights reserved.
        </Typography>
        <Typography variant="body2" align="center">
          <Link color="inherit" href="/privacy">
            Privacy Policy
          </Link>{' | '}
          <Link color="inherit" href="/terms">
            Terms of Service
          </Link>
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 