import http from 'http';
import 'colors';

/*
 * POLL UNTIL SERVERS HAVE STARTED
 */

const poll = ({name, url, readyStatusCode, intervalTimeout}) => {
  const serverReady = (done) => {
    const intervalId = setInterval(() => {
      const request = http.get(url, (res) => {
        if (res.statusCode === readyStatusCode) {
          clearInterval(intervalId);
          console.info(`${name} ready...`.magenta);
          done();
        } else {
          console.info(`waiting for ${name}: `.yellow + `non-${readyStatusCode} status...`);
        }
      })
        .on('error', (err) => {
          console.info(`waiting for ${name}: `.yellow + `${err}...`);
        });

      request.setTimeout(intervalTimeout, () => {
        console.info(`waiting for ${name}: `.yellow + 'timeout...');
        request.abort();
      });
    }, intervalTimeout);
  };

  return serverReady;
};

export default poll;
