import fs from 'fs';
import path from 'path';

// Helper functions defined at the top
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const tweetTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - tweetTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  return `${Math.floor(diffInMinutes / 1440)}d`;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API endpoint called');
    console.log('Request body:', JSON.stringify(req.body));

    const { text, timestamp, secret } = req.body;
    
    // Security: Check secret key
    const expectedSecret = process.env.UPDATE_SECRET || 'anil-tweet-july-2025';
    if (secret !== expectedSecret) {
      console.log('Invalid secret provided. Expected:', expectedSecret, 'Got:', secret);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!text) {
      console.log('No text provided in request');
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Updating tweet with text:', text);

    // Read the current HTML file
    const htmlPath = path.join(process.cwd(), 'index.html');
    let htmlContent;
    
    try {
      htmlContent = fs.readFileSync(htmlPath, 'utf8');
      console.log('HTML file read successfully');
    } catch (readError) {
      console.error('Error reading HTML file:', readError);
      return res.status(500).json({ error: 'Could not read HTML file', details: readError.message });
    }

    // Escape HTML special characters
    const escapedText = escapeHtml(text);
    console.log('Text escaped:', escapedText);

    // Update tweet content - look for the tweet-text div
    const tweetRegex = /<div class="tweet-text">\s*[\s\S]*?\s*<\/div>/;
    const newTweetHtml = `<div class="tweet-text">
                    ${escapedText}
                </div>`;

    if (!tweetRegex.test(htmlContent)) {
      console.error('Tweet element not found in HTML');
      console.log('HTML content preview:', htmlContent.substring(0, 500));
      return res.status(500).json({ error: 'Tweet element not found in HTML' });
    }

    htmlContent = htmlContent.replace(tweetRegex, newTweetHtml);
    console.log('Tweet content updated successfully');

    // Update timestamp if provided
    if (timestamp) {
      const timeAgo = getTimeAgo(timestamp);
      const timestampRegex = /<span class="timestamp">·\s*.*?<\/span>/;
      const newTimestampHtml = `<span class="timestamp">· ${timeAgo}</span>`;
      
      if (timestampRegex.test(htmlContent)) {
        htmlContent = htmlContent.replace(timestampRegex, newTimestampHtml);
        console.log('Timestamp updated to:', timeAgo);
      } else {
        console.log('Timestamp element not found, skipping timestamp update');
      }
    }

    // Write updated HTML back to file
    try {
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log('HTML file written successfully');
    } catch (writeError) {
      console.error('Error writing HTML file:', writeError);
      return res.status(500).json({ error: 'Could not write HTML file', details: writeError.message });
    }

    console.log('Update completed successfully');

    return res.status(200).json({
      success: true,
      message: 'HTML updated successfully',
      updatedText: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected error in API handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}