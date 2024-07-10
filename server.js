const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const axios = require('axios');
const cheerio = require('cheerio');

app.use(express.static('public'));

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('URL parameter is required');
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Modify all relative URLs to absolute URLs
    $('a, link, script, img').each((i, elem) => {
      const attr = $(elem).attr('href') ? 'href' : 'src';
      let attrValue = $(elem).attr(attr);
      if (attrValue && !attrValue.startsWith('http')) {
        $(elem).attr(attr, new URL(attrValue, url).href);
      }
    });

    // Modify all forms to submit through our proxy
    $('form').each((i, elem) => {
      const action = $(elem).attr('action');
      if (action) {
        $(elem).attr('action', `/proxy?url=${encodeURIComponent(new URL(action, url).href)}`);
      }
    });

    res.send($.html());
  } catch (error) {
    res.status(500).send(`Error fetching URL: ${error.message}`);
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('urlChange', (url) => {
    io.emit('urlChange', url);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
