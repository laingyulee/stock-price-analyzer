import React from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

function LlmAnalysisPanel({ analysis, generatedAt }) {
  return (
    <Box>
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        分析结果
      </Typography>
      
      <ReactMarkdown
        components={{
          h3: ({node, ...props}) => <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }} {...props} />,
          p: ({node, ...props}) => <Typography variant="body2" paragraph {...props} />,
          li: ({node, ...props}) => <Typography component="li" variant="body2" sx={{ ml: 2 }} {...props} />,
        }}
      >
        {analysis}
      </ReactMarkdown>
      {generatedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          分析生成于: {new Date(generatedAt).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}

export default LlmAnalysisPanel;
