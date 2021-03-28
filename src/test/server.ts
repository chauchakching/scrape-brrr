import express = require("express");
import path from "path";
import http from 'http'
import fs from 'fs'
import iconv from 'iconv-lite'

const port = 8081;

export const startTestServer = async () => {
  const app = express();

  app.get('/big5', (req, res) => {
    const text = fs.readFileSync(path.join(__dirname, 'public', 'big5.html'), 'utf-8')
    const encodedText = iconv.encode(text, 'big5')
    res.charset = 'big5'
    res.send(encodedText)
  })

  app.use(express.static(path.join(__dirname, "public")));
  
  return app.listen(port)
};
