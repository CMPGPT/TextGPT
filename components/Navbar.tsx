import React from 'react';
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';

type NavbarProps = {
  serviceName?: 'IQR' | 'Kiwi';
  isLoggedIn?: boolean;
  isAdmin?: boolean;
};

const Navbar: React.FC<NavbarProps> = ({ 
  serviceName, 
  isLoggedIn = false, 
  isAdmin = false 
}) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {serviceName ? `${serviceName} Dashboard` : 'TextGPT'}
        </Typography>
        <Box>
          {!isLoggedIn ? (
            <>
              <Button color="inherit" component={Link} href="/">
                Home
              </Button>
              <Button color="inherit" component={Link} href="/iqr/landing">
                IQR
              </Button>
              <Button color="inherit" component={Link} href="/kiwi/landing">
                Kiwi
              </Button>
              <Button color="inherit" component={Link} href="/auth/login">
                Login
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} href={`/${serviceName?.toLowerCase() || 'dashboard'}`}>
                Dashboard
              </Button>
              <Button color="inherit" component={Link} href={`/${serviceName?.toLowerCase() || ''}/analytics`}>
                Analytics
              </Button>
              {isAdmin && (
                <Button color="inherit" component={Link} href="/admin/dashboard">
                  Admin
                </Button>
              )}
              <Button color="inherit">
                Logout
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 