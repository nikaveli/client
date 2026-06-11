import React from 'react';
import { Box, CircularProgress, Typography } from '@material-ui/core';

const scoreColor = (percent) => {
  if (percent >= 80) return '#2e7d32';
  if (percent >= 50) return '#f9a825';
  return '#c62828';
};

const ScoreRing = ({ percent, size = 120 }) => (
  <Box position="relative" display="inline-flex">
    <CircularProgress
      variant="determinate"
      value={100}
      size={size}
      thickness={4}
      style={{ color: '#e0e0e0', position: 'absolute' }}
    />
    <CircularProgress
      variant="determinate"
      value={percent}
      size={size}
      thickness={4}
      style={{ color: scoreColor(percent) }}
    />
    <Box
      top={0}
      left={0}
      bottom={0}
      right={0}
      position="absolute"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Typography variant="h4" component="div" style={{ color: scoreColor(percent) }}>
        {percent}
      </Typography>
      <Typography variant="caption" color="textSecondary">/ 100</Typography>
    </Box>
  </Box>
);

export default ScoreRing;
