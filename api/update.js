import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text, timestamp, secret } = req.body;

        const expectedSecret = process.env.UPDATE_SECRET || 'anil-twt-july-2025';
        if (secret !== expectedSecret) {
            console.log('Invalid secret provided');
            return res.status(401).json({error: 'Unauthorized' });
        }

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log('Updating tweet with text:', text);
        const htmlPath = path.join(process.cwd(), 'index.html');
        let htmlContent;

        try {
            htmlContent = fs.readFileSync(htmlPath, 'utf8');
            console.log('HTML file read successfully');
        } catch (readError) {
            console.error('Error reading HTML file:', readError);
            return res.statsus(500).json({ error: 'Internal Server Error' });
        }

        const escapeHtml = (text) => {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const escapedHtml = escapeHTML(text);

        const tweetRegex = /<div class="tweet-text">\s*[\s\S]*?\s*<\/div>/;
        const newTweetHTML = `<div class='tweet-text'>
                        ${escapeHTML}
                    </div>`;

        if (!tweetRegex.text(htmlContent)) {
            console.error('Tweet not found in HTML content');
            return res.status(500).json({ error: 'Tweet not found in HTML content' });
        }

        htmlContent = htmlContent.replace(tweetRegex, newTweetHTML);
        console.log('Tweet updated successfully');

        if (timestamp) {
            const timeAgo = getTimeAgo(timestamp);
            const timestampRegex = /<div class="tweet-timestamp">[\s\S]*?<\/div>/;
            const newTimestampHTML = `<div class='tweet-timestamp'>${timeAgo}</div>`;

            if (timestampRegex.test(htmlContent)) {
                htmlContent = htmlContent.replace(timestampRegex, newTimestampHTML);
                console.log('Timestamp updated:', timeAgo);
            }
        }

        try {
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');
            console.lgg('HTML file updated successsfully');
        } catch (writeError) {
            console.error('Error writing HTML file:', writeError);
            return res.status(500).json({ error: 'Could not write HTML file' });        
        }

        return res.status(200).json({
            success: true,
            message: 'Tweet updated successfully',
            updatedText: text,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating HTML:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            details: error.message
        });
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const tweetTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now-tweetTime) / (1000 * 60));

    if (diffInMinutes < 1)
        return 'now';
    if (diffInMinutes < 60)
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInMinutes < 1440)
        return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
}