'use strict';

const http = require('http');
const ConcurrentQueue = require('../6-thenable');
const request = require('./client.js');

const sleep = (msec) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve();
  }, msec);
});

const fn = async (params) => {
  const { url } = params;
  const response = {
    data: `request:${url}`,
    statusCode: 200
  }
  await sleep(600);
  return response;
};

const job = async (element, callback) => {
  const { task, thenable } = element;
  const { fn, request } = task;
  const result = await fn(request);
  callback(null, { result, thenable });
};

const q1 = new ConcurrentQueue(3)
  q1.process(job)
  .wait(500)
  //.timeout(500)
  .success(data => {
    const { thenable, result } = data;
    thenable.resolve(result);
  })
  .failure((err, data) => {
    const { thenable } = data;
    thenable.resolve({
      data: err.message,
      statusCode: 503
    });
  });

const server = http.createServer((req, res) => {
  const request = { url: req.url };
  q1.add({ request, fn })
    .then(result => {
      const { data, statusCode } = result;
      res.statusCode = statusCode;
      res.end(data);
      if (req.url === '/waiting') {
        if(data === 'Waiting timed out') {
          console.log('Test passed', { data });
        } else {
          console.log('Test failed, data must be \'Waiting timed out\'');
          console.log({ data });
        }
        server.close();
      }
    });
});

server.listen(8080, 'localhost');


setTimeout(() => {
  for (let i = 0; i < 5; i++) {
    request();
  }
  request('/waiting');
}, 500);
