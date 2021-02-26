'use strict';

const http = require('http');
const ConcurrentQueue = require('../6-thenable');
const request = require('./client.js');

const urls = async request => {
  if (request.url === '/') {
    return {
      data: 'main',
    };
  } else {
    return new Error('Forbiden');
  }
};

const dataUrls = {
  'main': () => '<h1>hello from main page</h1>'
}

const serializeError = {
  Forbiden: { data: '<h1>Forbiden</h1>', statusCode: 403 },
}

const job = async (element, callback) => {
  const { task, thenable } = element;
  const { request, urls } = task;
  const result = await urls(request);
  if (result instanceof Error) {
    callback(result, { thenable });
  } else {
    callback(null, { result, thenable });
  }
};

const q2 = new ConcurrentQueue(5)
  .process((element, callback) => {
    const { task, thenable } = element;
    const { result } = task;
    const fn = dataUrls[result.data];
    if (fn) {
      const data = fn();
      const statusCode = 200;
      const result = { data, statusCode };
      callback(null, { result, thenable });
    } else {
      const err = new Error('Error processing page data');
      callback(err, { thenable });
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
      thenable.reject(err);
  });

let count = 0;
const tests = 2;

const server = http.createServer((req, res) => {
  count++;
  const request = { url: req.url };
  q1.add({ request, urls })
    .then(result => {
      const { data, statusCode } = result;
      res.statusCode = statusCode;
      res.end(data);
      if (count === tests) server.close();
    }, err => {
      const { data, statusCode } = serializeError[err.message];
      if (data && statusCode) {
        res.statusCode = statusCode;
        res.end(data);
        if (count === tests) server.close();
      } else {
        res.statusCode = 503;
        res.end('error processing data');
        if (count === tests) server.close();
      }
    });
});

server.listen(8080, 'localhost');

(async () => {
  const test1 = await request('/');
  const rawData = test1.rawData;
  if ( rawData === '<h1>hello from main page</h1>') {
    console.log('Test1 passed - data from destination', { rawData });
  } else {
    console.log('Test1 failed - data from destination', { rawData });
    console.log('rawData must be: <h1>hello from main page</h1>');
    console.log({ rawData });
  }
})();

(async () => {
  const test2 = await request('/somepage');
  const rawData = test2.rawData;
  if ( rawData === '<h1>Forbiden</h1>') {
    console.log('Test2 passed - error from source', { rawData });
  } else {
    console.log('Test2 failed - error from source', { rawData });
    console.log('rawData must be: <h1>Forbiden</h1>');
    console.log({ rawData });
  }
})();

//при заходе на / разрешено просматривать страницу
//на другие урлы - запрещено
