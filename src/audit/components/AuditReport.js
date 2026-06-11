import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import WarningIcon from '@material-ui/icons/Warning';
import CancelIcon from '@material-ui/icons/Cancel';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';

import { STATUS } from '../auditEngine';
import ScoreRing from './ScoreRing';

const statusIcon = {
  [STATUS.PASS]: <CheckCircleIcon style={{ color: '#2e7d32' }} />,
  [STATUS.WARN]: <WarningIcon style={{ color: '#f9a825' }} />,
  [STATUS.FAIL]: <CancelIcon style={{ color: '#c62828' }} />,
  [STATUS.NA]: <RemoveCircleOutlineIcon color="disabled" />,
};

const sectionScore = (section) => {
  const scored = section.checks.filter((c) => c.status !== STATUS.NA);
  if (!scored.length) return null;
  return {
    points: scored.reduce((sum, c) => sum + c.points, 0),
    max: scored.reduce((sum, c) => sum + c.maxPoints, 0),
  };
};

const AuditReport = ({ audit, location }) => (
  <Box>
    <Paper style={{ padding: 24, marginBottom: 24 }}>
      <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 24 }}>
        <ScoreRing percent={audit.percent} />
        <Box flex={1} minWidth={240}>
          <Typography variant="h5">{location.title}</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {location.storefrontAddress?.addressLines?.join(', ') || 'Service-area business'}
          </Typography>
          <Typography variant="body1">
            Earned <strong>{audit.score}</strong> of <strong>{audit.maxScore}</strong> auditable
            points across {audit.sections.length} categories.
          </Typography>
        </Box>
      </Box>
    </Paper>

    {audit.recommendations.length > 0 && (
      <Paper style={{ padding: 24, marginBottom: 24 }}>
        <Typography variant="h6" gutterBottom>Top recommendations</Typography>
        <List dense>
          {audit.recommendations.slice(0, 5).map((rec) => (
            <ListItem key={rec} disableGutters>
              <ListItemIcon style={{ minWidth: 36 }}>
                <WarningIcon fontSize="small" style={{ color: '#f9a825' }} />
              </ListItemIcon>
              <ListItemText primary={rec} />
            </ListItem>
          ))}
        </List>
      </Paper>
    )}

    {audit.sections.map((section) => {
      const score = sectionScore(section);
      return (
        <Accordion key={section.id} defaultExpanded={Boolean(score && score.points < score.max)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
              <Typography variant="subtitle1">{section.title}</Typography>
              <Chip
                size="small"
                label={score ? `${score.points} / ${score.max}` : 'unavailable'}
                style={{ marginRight: 8 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails style={{ flexDirection: 'column', paddingTop: 0 }}>
            <Divider style={{ marginBottom: 8 }} />
            <List dense disablePadding>
              {section.checks.map((c) => (
                <ListItem key={c.id} disableGutters alignItems="flex-start">
                  <ListItemIcon style={{ minWidth: 36, marginTop: 4 }}>
                    {statusIcon[c.status]}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${c.label} (${c.points}/${c.maxPoints})`}
                    secondary={[c.details, c.recommendation].filter(Boolean).join(' — ')}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      );
    })}
  </Box>
);

export default AuditReport;
