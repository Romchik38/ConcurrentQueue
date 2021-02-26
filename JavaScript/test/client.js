'use strict';

const http = require('http');

const get = http.get;

const request = (url = '/') => new Promise((resolve, reject) => {
  let rawData = '';
  let statusCode = NaN;
  get(`http://localhost${url}`, { port: 8080 }, res => {
    res.setEncoding('utf8');
    statusCode = res.statusCode;
    res.on('data', chunk => {
      rawData += chunk;
    });
    res.on('end', () => {
      resolve({ statusCode, rawData });
    });
  });
})

module.exports = request;
