'use strict';

const http = require('http');
const ConcurrentQueue = require('../6-thenable');
const request = require('./client');

const fn = async (params) => {
  const { url } = params;
  const response = {
    data: `request:${url}`,
    statusCode: 200
  }
  return response;
};

const job = async (element, callback) => {
  const { task, thenable } = element;
  const { fn, request } = task;
  const result = await fn(request);
  if (request.url === '/pipe-err2') {
    const err = new Error('error /pipe-err2')
    callback(err, { result, thenable });
  } else {
    callback(null, { result, thenable });
  }
};

const q2 = new ConcurrentQueue(5)
  .process((element, callback) => {
    const { task, thenable } = element;
    //Test on success
    const { result } = task;
    if (result.data === 'request:/pipe') {
      const result = { data: 'piped', statusCode: 200 }
      callback(null, { result, thenable });
    } else {
      //Test on error
      const result = { data: 'not found', statusCode: 404 }
      const err = new Error('not found');
      callback(err, { result, thenable });
    }
  })
  .success(data => {
    const { thenable, result } = data;
    setTimeout(() => {
      thenable.resolve(result);
    }, 0)
  })
  .failure((err, data) => {
    const { thenable, result } = data;
    setTimeout(() => {
      thenable.reject(result);
    }, 0)
  });

const q1 = new ConcurrentQueue(2)
  .process(job)
  .wait(500)
  .pipe(q2)
  .success(data => {
    const { thenable, result } = data;
    thenable.resolve(result);
  })
  .failure((err, data) => {
    const { thenable } = data;
    setTimeout(() => {
      thenable.reject({
        err: err,
        data: 'error processing page',
        statusCode: 503
      });
    }, 0);
  });

const server = http.createServer((req, res) => {
  const request = { url: req.url };
  q1.add({ request, fn })
    .then(result => {
      const { data, statusCode } = result;
      res.statusCode = statusCode;
      res.end(data);
      if (req.url === '/pipe') {
        if(data === 'piped') {
          console.log('Test passed', { data });
        } else {
          console.log('Test failed, data must be \'piped\'');
          console.log({ data });
        }
      } else if (req.url === '/pipe-err'){
        console.log({ data });
      }
    }, err => {
      const { data, statusCode } = err;
      res.statusCode = statusCode;
      res.end(data);
    });
});

server.listen(8080, 'localhost');


setTimeout(() => {
  request('/pipe');
}, 500);

setTimeout(() => {
  request('/pipe-err');
}, 600);

setTimeout(() => {
  request('/pipe-err2');
}, 100);
