'use strict';

const http = require('http');

const get = http.get;

const request = (url = '/') => {
  let rawData = '';
  let statusCode = NaN;
  get(`http://localhost${url}`, { port: 8080 }, res => {
    res.setEncoding('utf8');
    statusCode = res.statusCode;
    res.on('data', chunk => {
      rawData += chunk;
    });
    res.on('end', () => {
      //console.log({ statusCode, rawData });
      if (statusCode !== 200) {
        console.log({ statusCode, rawData });
      }
    });
  });
};

for (let i = 0; i < 2000; i++) {
  request('/users');
}
