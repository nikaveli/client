import React, { useState } from 'react';
import { AppBar, Tab, Tabs, Toolbar, Typography } from '@material-ui/core';
import StorefrontIcon from '@material-ui/icons/Storefront';

import AuditApp from './audit/components/AuditApp';
import OrderPage from './order/components/OrderPage';

const App = () => {
  const [page, setPage] = useState('audit');

  return (
    <>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar>
          <StorefrontIcon color="primary" style={{ marginRight: 8 }} />
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Local Business Toolkit
          </Typography>
          <Tabs
            value={page}
            onChange={(e, value) => setPage(value)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Profile Audits" value="audit" />
            <Tab label="Business Cards" value="order" />
          </Tabs>
        </Toolbar>
      </AppBar>
      {page === 'audit' ? <AuditApp /> : <OrderPage />}
    </>
  );
};

export default App;
