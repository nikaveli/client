import React, { useState } from 'react';
import { Box, Paper, Typography } from '@material-ui/core';

export const THEMES = [
  { id: 'navy', bg: '#2d3553', accent: '#f2b632', shape: '#9fc2cc', text: '#ffffff' },
  { id: 'mint', bg: '#bcd8d3', accent: '#2d3553', shape: '#ffffff', text: '#2d3553' },
  { id: 'blush', bg: '#f4e4dc', accent: '#b76e4e', shape: '#ffffff', text: '#5a3a2a' },
];

/**
 * SVG mock of the printed card. Reacts to orientation, rounded corners,
 * and the selected colour theme so the preview tracks the configuration.
 */
const CardArt = ({ theme, vertical, cornerRadius }) => {
  const w = vertical ? 200 : 350;
  const h = vertical ? 350 : 200;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Business card preview"
    >
      <rect x="1" y="1" width={w - 2} height={h - 2} rx={cornerRadius} fill={theme.bg} stroke="#d0d0d0" />
      <circle cx={w * 0.82} cy={h * 0.2} r={Math.min(w, h) * 0.18} fill={theme.shape} opacity="0.7" />
      <circle cx={w * 0.12} cy={h * 0.85} r={Math.min(w, h) * 0.12} fill={theme.accent} opacity="0.8" />
      <text x={w * 0.08} y={h * 0.32} fill={theme.text} fontSize={Math.min(w, h) * 0.11} fontFamily="Georgia, serif" fontStyle="italic">
        Mike Owens
      </text>
      <text x={w * 0.08} y={h * 0.48} fill={theme.text} fontSize={Math.min(w, h) * 0.09} fontFamily="Arial, sans-serif" letterSpacing="2">
        GRAPHIC DESIGNER
      </text>
      <rect x={w * 0.08} y={h * 0.56} width={w * 0.3} height={2} fill={theme.accent} />
      <text x={w * 0.08} y={h * 0.72} fill={theme.text} fontSize={Math.min(w, h) * 0.06} fontFamily="Arial, sans-serif">
        123.456.7890
      </text>
      <text x={w * 0.08} y={h * 0.82} fill={theme.text} fontSize={Math.min(w, h) * 0.06} fontFamily="Arial, sans-serif">
        MIKE@OWENS.COM
      </text>
    </svg>
  );
};

const CardPreview = ({ orientation, roundedCorner }) => {
  const [theme, setTheme] = useState(THEMES[0]);
  const vertical = orientation === 'vertical';
  const cornerRadius = roundedCorner === 'none' ? 4 : roundedCorner === 'radius-1-8' ? 14 : 24;

  return (
    <Box>
      <Paper
        variant="outlined"
        style={{
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          background: '#f5f3f0',
        }}
      >
        <Box width={vertical ? 200 : 350} maxWidth="100%">
          <CardArt theme={theme} vertical={vertical} cornerRadius={cornerRadius} />
        </Box>
      </Paper>
      <Box display="flex" justifyContent="center" style={{ gap: 12 }} mt={2}>
        {THEMES.map((t) => (
          <Box
            key={t.id}
            onClick={() => setTheme(t)}
            border={t.id === theme.id ? '2px solid #1976d2' : '1px solid #ccc'}
            borderRadius={4}
            p={0.5}
            style={{ cursor: 'pointer', width: 72 }}
          >
            <CardArt theme={t} vertical={false} cornerRadius={4} />
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="textSecondary" align="center" display="block">
        Preview reflects orientation, corners, and sample color themes
      </Typography>
    </Box>
  );
};

export default CardPreview;
