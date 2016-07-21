import 'colors';
import path from 'path';
import url from 'url';
import {spawn} from 'child_process';
import {sync as glob} from 'glob';
import {nextOnExit, killOnExit, nullProcess} from '../helpers/processes';
import {seleniumLogger} from '../helpers/logger';
// import webpack from 'webpack';
// import webpackConfig from './webpack/e2e.config';

// webpack(webpackConfig, (err, stats) => {
//   const assets = stats.toJson().assetsByChunkName;
//   const testFiles = Object.keys(assets).map((chunk) => {
//     // TODO: get path prefix from factored out config from e2e.config.js
//     return path.resolve(__dirname, 'build', assets[chunk]);
//   });

const defaultDatabaseUrl = 'mongodb://localhost:27017/__storj-bridge-test';
const defaultBackendUrl = 'http://localhost:6382';
const typeName = path.basename(__filename, '.js');

const run = (next, options) => {
  const {
    mockBackend,
    backendUrl,
    databaseUrl,
  } = options;

  /*
   * Set environment variables used by webpack dev server
   * see <project root>/src/config.js
   */
  if (mockBackend) {
    process.env.APIHOST = 'localhost';
    process.env.APIPORT = Number(process.env.PORT) + 2 || 4002;
  } else {
    const {
      hostname,
      port
    } = url.parse(backendUrl || defaultBackendUrl);
    process.env.APIHOST = process.env.APIHOST || hostname;
    process.env.APIPORT = process.env.APIPORT || port;
    process.env.DATABASE_URL = process.env.DATABASE_URL || databaseUrl || defaultDatabaseUrl;
  }

  const defaultSpawnOptions = {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: ['ignore', process.stdout, process.stderr]
  };

  const e2eTestRoot = path.resolve(__dirname, '../../e2e');
  const testFiles = glob(e2eTestRoot + '/*{,*/*}-e2e.js');

  console.info('starting selenium...'.magenta);
  const seleniumProcess = spawn('java', [
    '-jar', path.resolve(__dirname, '../../bin/selenium-server-standalone-2.53.1.jar')
  ], {
    ...defaultSpawnOptions,
    stdio: ['ignore', seleniumLogger.fd, seleniumLogger.fd],
    detached: true
  });

  console.info('starting dev server...'.magenta);
  const devServerProcess = spawn('node', [
    path.resolve(__dirname, '../../bin/server.js')
  ], {defaultSpawnOptions});

  let mockBackendProcess;
  if (mockBackend) {
    console.info('starting mock-backend server...'.magenta);
    mockBackendProcess = spawn('node', [
      path.resolve(__dirname, './mockBackend/index.js')
    ], {defaultSpawnOptions});
  } else {
    console.info(`*not* starting mock-backend server - using ${mockBackend}...`.magenta);
    mockBackendProcess = nullProcess;
  }

  console.info('starting mocha...'.magenta);
  const mochaProcess = spawn(path.resolve(__dirname, '../../node_modules/mocha/bin/_mocha'), [
    '--compilers', `js:${path.resolve(__dirname, '../../server.babel.js')}`,
    ...testFiles
  ], {...defaultSpawnOptions, stdio: 'inherit'});

  nextOnExit(mochaProcess, next);

  killOnExit(seleniumProcess, mochaProcess);
  killOnExit(mochaProcess, [devServerProcess, mockBackendProcess]);
  killOnExit(process, [seleniumProcess, mochaProcess, devServerProcess, mockBackendProcess]);
};

// });

run.typeName = typeName;
export default run;
