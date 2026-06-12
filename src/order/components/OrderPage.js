import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Grid,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import HelpIcon from '@material-ui/icons/Help';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';

import {
  SIZES,
  ORIENTATIONS,
  PAPERS,
  COLORS,
  QUANTITIES,
  ROUNDED_CORNERS,
  COATINGS,
  PRODUCTION_TIMES,
  DEFAULT_CONFIG,
  calculateSubtotal,
} from '../pricing';
import CardPreview from './CardPreview';

const checkAdornment = (
  <InputAdornment position="end">
    <CheckCircleIcon style={{ color: '#4caf50', fontSize: 20 }} />
  </InputAdornment>
);

const OptionSelect = ({ label, value, onChange, options, showCheck = true, helpText }) => (
  <TextField
    select
    fullWidth
    variant="outlined"
    size="small"
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    InputProps={showCheck ? { endAdornment: checkAdornment } : undefined}
    helperText={helpText}
    style={{ marginBottom: 16 }}
  >
    {options.map((o) => (
      <MenuItem key={o.id} value={o.id}>
        {o.label}
      </MenuItem>
    ))}
  </TextField>
);

/** Two-option toggle rendered as side-by-side buttons (orientation, production time). */
const ToggleRow = ({ label, value, onChange, options, labelAdornment }) => (
  <Box mb={2}>
    <Box display="flex" alignItems="center" style={{ gap: 4 }} mb={0.5}>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      {labelAdornment}
    </Box>
    <Grid container spacing={1}>
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Grid item xs={6} key={o.id}>
            <Button
              fullWidth
              variant={selected ? 'contained' : 'outlined'}
              onClick={() => onChange(o.id)}
              style={selected ? { backgroundColor: '#7cb342', color: '#fff' } : undefined}
            >
              <Box>
                <Typography variant="body2" component="div">{o.label}</Typography>
                {o.sublabel && (
                  <Typography variant="caption" component="div" style={{ textTransform: 'none' }}>
                    {o.sublabel}
                  </Typography>
                )}
              </Box>
            </Button>
          </Grid>
        );
      })}
    </Grid>
  </Box>
);

const UploadButton = ({ label, onFile }) => (
  <Button variant="contained" color="primary" component="label" style={{ borderRadius: 24 }}>
    {label}
    <input
      type="file"
      hidden
      accept="image/*,.pdf"
      onChange={(e) => e.target.files[0] && onFile(e.target.files[0].name)}
    />
  </Button>
);

const OrderPage = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [artwork, setArtwork] = useState({ front: null, back: null });

  const set = (key) => (value) => setConfig((c) => ({ ...c, [key]: value }));
  const subtotal = calculateSubtotal(config);

  return (
    <Container maxWidth="lg" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <Breadcrumbs separator="»" style={{ marginBottom: 8 }}>
        <Link color="primary" href="#/">Home</Link>
        <Link color="primary" href="#/business-cards">Business Cards</Link>
        <Typography color="textPrimary">Order</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>Business Cards</Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        High-quality paper stocks at affordable prices makes ordering business cards simple.
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <CardPreview orientation={config.orientation} roundedCorner={config.roundedCorner} />
        </Grid>

        <Grid item xs={12} md={6}>
          <OptionSelect label="Size" value={config.size} onChange={set('size')} options={SIZES} />
          <ToggleRow
            label="Orientation"
            value={config.orientation}
            onChange={set('orientation')}
            options={ORIENTATIONS}
          />
          <OptionSelect label="Paper" value={config.paper} onChange={set('paper')} options={PAPERS} />
          <OptionSelect label="Color" value={config.color} onChange={set('color')} options={COLORS} />
          <OptionSelect label="Quantity" value={config.quantity} onChange={set('quantity')} options={QUANTITIES} />
          <OptionSelect
            label="Rounded Corner"
            value={config.roundedCorner}
            onChange={set('roundedCorner')}
            options={ROUNDED_CORNERS}
            showCheck={false}
          />
          <OptionSelect
            label="Coating"
            value={config.coating}
            onChange={set('coating')}
            options={COATINGS}
            helpText={COATINGS.find((c) => c.id === config.coating)?.help}
          />
          <ToggleRow
            label="Production Time"
            value={config.production}
            onChange={set('production')}
            options={PRODUCTION_TIMES}
            labelAdornment={(
              <Tooltip title="Production time excludes shipping transit time.">
                <HelpIcon style={{ fontSize: 16, color: '#7cb342' }} />
              </Tooltip>
            )}
          />

          <Accordion variant="outlined">
            <AccordionSummary expandIcon={<AddIcon />}>
              <Typography variant="body2"><strong>Process Type</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="textSecondary">
                Printed on offset presses with full-color digital proofing. Gang-run scheduling
                keeps costs low; exact color matching available on request.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion variant="outlined" style={{ marginBottom: 16 }}>
            <AccordionSummary expandIcon={<AddIcon />}>
              <Typography variant="body2"><strong>Estimated Shipping</strong></Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="textSecondary">
                Ships from our facility within the selected production time. Ground delivery is
                typically 1–5 business days depending on destination; rates calculated at checkout.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Paper variant="outlined" style={{ padding: '12px 16px', marginBottom: 16, background: '#fafafa' }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="subtitle1"><strong>Subtotal (excludes shipping) :</strong></Typography>
              <Typography variant="subtitle1"><strong>${subtotal.toFixed(2)}</strong></Typography>
            </Box>
          </Paper>

          <Box display="flex" justifyContent="center" flexWrap="wrap" style={{ gap: 12 }}>
            <UploadButton label="Upload Front" onFile={(name) => setArtwork((a) => ({ ...a, front: name }))} />
            <UploadButton label="Upload Back" onFile={(name) => setArtwork((a) => ({ ...a, back: name }))} />
            <Button variant="contained" color="primary" style={{ borderRadius: 24 }}>
              Design Online
            </Button>
          </Box>

          {(artwork.front || artwork.back) && (
            <Box display="flex" justifyContent="center" style={{ gap: 8 }} mt={2}>
              {artwork.front && <Chip size="small" label={`Front: ${artwork.front}`} onDelete={() => setArtwork((a) => ({ ...a, front: null }))} />}
              {artwork.back && <Chip size="small" label={`Back: ${artwork.back}`} onDelete={() => setArtwork((a) => ({ ...a, back: null }))} />}
            </Box>
          )}

          <Box display="flex" alignItems="center" justifyContent="center" style={{ gap: 8 }} mt={3}>
            <VerifiedUserIcon color="primary" />
            <Typography variant="subtitle2" color="primary">Honest Pricing Guarantee</Typography>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrderPage;
