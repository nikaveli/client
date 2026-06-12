import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import SearchIcon from '@material-ui/icons/Search';
import StorefrontIcon from '@material-ui/icons/Storefront';

import { requestAccessToken, getClientId } from '../googleAuth';
import { fetchAccounts, fetchLocations, fetchAuditData } from '../gbpApi';
import { runAudit } from '../auditEngine';
import { buildSampleAuditData } from '../sampleData';
import AuditReport from './AuditReport';

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Something went wrong.';

const AuditApp = () => {
  const [token, setToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState('');
  const [locations, setLocations] = useState([]);
  const [locationName, setLocationName] = useState('');
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const connect = async () => {
    setError(null);
    setLoading(true);
    try {
      const accessToken = await requestAccessToken();
      const accountList = await fetchAccounts(accessToken);
      setToken(accessToken);
      setAccounts(accountList);
      if (accountList.length === 1) setAccountName(accountList[0].name);
      if (!accountList.length) {
        setError('No Business Profile accounts found for this Google account.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = useCallback(async () => {
    if (!token || !accountName) return;
    setError(null);
    setLoading(true);
    setLocations([]);
    setLocationName('');
    setAudit(null);
    try {
      const locationList = await fetchLocations(token, accountName);
      setLocations(locationList);
      if (locationList.length === 1) setLocationName(locationList[0].name);
      if (!locationList.length) {
        setError('This account has no locations.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, accountName]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const runDemoAudit = () => {
    const data = buildSampleAuditData();
    setError(null);
    setAudit({ result: runAudit(data), location: data.location, demo: true });
  };

  const runLocationAudit = async () => {
    const location = locations.find((l) => l.name === locationName);
    if (!location) return;
    setError(null);
    setLoading(true);
    setAudit(null);
    try {
      const data = await fetchAuditData(token, accountName, location);
      setAudit({ result: runAudit(data), location });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (audit?.demo) {
    return (
      <Container maxWidth="md" style={{ paddingBottom: 48 }}>
        <Box my={3}>
          <Alert
            severity="info"
            action={(
              <Button color="inherit" size="small" onClick={() => setAudit(null)}>
                Exit demo
              </Button>
            )}
          >
            Demo report built from sample data — connect a real Business Profile once your API
            access is approved.
          </Alert>
        </Box>
        <AuditReport audit={audit.result} location={audit.location} />
      </Container>
    );
  }

  if (!getClientId()) {
    return (
      <Container maxWidth="sm" style={{ marginTop: 48 }}>
        <Alert severity="info">
          <Typography variant="subtitle1" gutterBottom>Setup required</Typography>
          <Typography variant="body2">
            Set <code>REACT_APP_GOOGLE_CLIENT_ID</code> in a <code>.env</code> file (see{' '}
            <code>.env.example</code>) and restart the dev server. The README walks through
            creating the OAuth client and requesting Business Profile API access.
          </Typography>
        </Alert>
        <Box textAlign="center" mt={3}>
          <Button variant="outlined" color="primary" onClick={runDemoAudit}>
            Preview a sample audit
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" style={{ paddingBottom: 48 }}>
      <Box display="flex" alignItems="center" style={{ gap: 12 }} my={4}>
        <StorefrontIcon fontSize="large" color="primary" />
        <Box>
          <Typography variant="h4">Business Profile Audit</Typography>
          <Typography variant="body2" color="textSecondary">
            Connect a Google account, pick a location, and get a scored audit with recommendations.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" style={{ marginBottom: 16 }}>{error}</Alert>}

      {!token ? (
        <Paper style={{ padding: 32, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>Connect your Google Business Profile</Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            You’ll be asked to grant read access to the Business Profile locations you manage.
            Nothing is stored — the audit runs entirely in your browser.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={connect}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Sign in with Google
          </Button>
          <Box mt={2}>
            <Button color="primary" size="small" onClick={runDemoAudit}>
              Preview a sample audit
            </Button>
          </Box>
          <Box mt={1}>
            <Typography variant="caption" color="textSecondary">
              API access not approved yet?{' '}
              <Link href="https://developers.google.com/my-business/howtos/prereqs" target="_blank" rel="noopener">
                Request it here.
              </Link>
            </Typography>
          </Box>
        </Paper>
      ) : (
        <>
          <Paper style={{ padding: 24, marginBottom: 24 }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth>
                  <InputLabel id="account-label">Account</InputLabel>
                  <Select
                    labelId="account-label"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <MenuItem key={a.name} value={a.name}>
                        {a.accountName || a.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth disabled={!locations.length}>
                  <InputLabel id="location-label">Location</InputLabel>
                  <Select
                    labelId="location-label"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  >
                    {locations.map((l) => (
                      <MenuItem key={l.name} value={l.name}>
                        {l.title || l.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={runLocationAudit}
                  disabled={!locationName || loading}
                  startIcon={<SearchIcon />}
                >
                  Audit
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {loading && (
            <Box display="flex" justifyContent="center" my={6}>
              <CircularProgress />
            </Box>
          )}

          {audit && !loading && <AuditReport audit={audit.result} location={audit.location} />}
        </>
      )}
    </Container>
  );
};

export default AuditApp;
