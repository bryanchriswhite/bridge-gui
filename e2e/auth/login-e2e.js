import url from 'url';
import {expect} from 'chai';
import nightwatch from 'nightwatch';
import 'colors';
import {parallel, series} from 'async';
import cleanerFactory from '../helpers/databaseCleaner';
import poll from '../helpers/pollServer';
import * as itShould from '../sharedBehaviors';

const noop = (done) => {
  setTimeout(done, 0);
};
const devServerPort = Number(process.env.PORT) + 1 || 4001;
const devServerBaseUrl = `http://localhost:${devServerPort}/`;
const backendBaseUrl = url.format({
  protocol: 'http',
  hostname: process.env.APIHOST,
  port: process.env.APIPORT,
  slashes: true
});
console.log('backendBaseUrl: %j', backendBaseUrl);
const bootTimeout = 15000;
const bootIntervalTimeout = 500;
const defaultPollOptions = {
  readyStatusCode: 200,
  intervalTimeout: bootIntervalTimeout
};

// TODO: use process.env.DATABASE_URL
let cleanMongo;

cleanMongo = !!process.env.DATABASE_URL ?
  cleanerFactory(url.parse(process.env.DATABASE_URL)) :
  noop;

const backendReady = poll({name: 'backend', url: backendBaseUrl, ...defaultPollOptions});
const devServerReady = poll({name: 'dev server', url: devServerBaseUrl, ...defaultPollOptions});

context('After server boot:', () => {
  const client = nightwatch.initClient({silent: true});
  const browser = client.api();

  /* NOTE: must use ES5 anon function syntax.
   * ES6->ES5 transpilation breaks some introspection
   * and `this.timeout` won't work
   */
  before(function(done) {
    this.timeout(bootTimeout);
    parallel([
      devServerReady,
      backendReady,
      cleanMongo
    ], () => {setTimeout(done, 10000)});
  });

  describe('Login page', function() {
    this.timeout(30000);

    const emailSelector = 'form input[name="email"]';
    const passwordSelector = 'form input[name="password"]';
    const submitSelector = 'form [type="submit"]';
    const loginUrl = devServerBaseUrl;
    const goToLogin = (done) => {
      parallel([
        (next) => {
          console.log('going to url: %j', loginUrl);
          browser
            .url(loginUrl)
            .waitForElementVisible('body', 20000);
          console.log('starging...');
          client.start(() => {console.log('hello from waitforbody'); next(null);});
        },
        cleanMongo
      ], () => {console.log('hello fro login done'); done();});
    };

    before(goToLogin);

    itShould.renderElements({
      'email field': emailSelector,
      'password field': passwordSelector,
      'submit button': submitSelector
    });
    // it('should render the email field', (done) => {
    //   browser.expect.element(emailSelector).to.be.present;
    //   client.start(done);
    // });
    //
    // it('should render the password field', (done) => {
    //   browser.expect.element(passwordSelector).to.be.present;
    //   client.start(done);
    // });
    //
    // it('should render the submit button', (done) => {
    //   browser.expect.element(submitSelector).to.be.present;
    //   client.start(done);
    // });

    context('Login:', () => {
      const defaultEmail = 'testy@example.com';
      const defaultPassword = 'badpassword';
      const loginWith = ({email = defaultEmail, password = defaultPassword}) => {
        return (done) => {
          goToLogin(() => {
            /*
             * Fill in email and password, and press the "enter" key.
             */
            browser
              .setValue(emailSelector, email)
              .setValue(passwordSelector, [password, browser.Keys.ENTER])
              .pause(500)
            ;
            done();
          });
        };
      };

      describe('successful login', () => {
        const successMessage = 'Success';
        // NOTE: must pass object literal cos ES6->ES5
        before(loginWith({}));

        itShould.renderText({description: 'a success message', text: successMessage});
        // it(`should render a success message: ${successMessage}`, (done) => {
        //   browser.assert.containsText('body', successMessage);
        //   client.start(done);
        // });

        it('should change the url', (done) => {
          browser.assert.urlContains('signup-success');
          client.start(done);
        });
      });

      describe('incorrect password', () => {
        const errorMessage = 'Invalid email or password';
        const password = 'wrongpassword';
        let previousUrl;
        before((done) => {
          series([
            loginWith({password}),
            (next) => {
              previousUrl = browser.url(url => url);
              client.start(next);
            }
          ], done);
        });

        itShould.renderText({description: 'an error message', text: errorMessage});
        // it(`should render an error message: ${errorMessage}`, (done) => {
        //   browser.assert.containsText('body', errorMessage);
        //   client.start(done);
        // });

        itShould.notChangeTheUrl();
        // it('should not change the url', (done) => {
        //   browser.url((previousUrl) => {
        //     browser.assert.urlEquals(previousUrl);
        //     client.start(done);
        //   });
        //   client.start(done);
        // });
      });

      describe('no account for given email', () => {
        const errorMessage = 'Something went wrong';
        const email = 'nonexistent@example.com';
        before(loginWith({email}));

        itShould.notChangeTheUrl();
        // it('should not change the url', (done) => {
        //   browser.assert.urlContains(loginUrl);
        //   client.start(done);
        // });

        // TODO: open an issue for this case and sync the copy
        itShould.renderText({description: 'an error message', text: errorMessage});
        // it(`should render an error message: ${errorMessage}`, (done) => {
        //   /*
        //    * There should be some client-side messaging to handle
        //    * unexpected server-side errors esp. CORS failure
        //    */
        //   // TODO: open an issue for this case and sync the copy
        //   browser.assert.containsText('body', errorMessage);
        //   client.start(done);
        // });
      });
    });

    // describe('Form validation', () => {
    //   // pending
    // });

    after((done) => {
      browser.end();
      client.start(done);
    });
  });
});
