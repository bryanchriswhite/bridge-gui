import url from 'url';
import {expect} from 'chai';
import nightwatch from 'nightwatch';
import 'colors';
import {parallel, series} from 'async';
import cleanerFactory from '../helpers/databaseCleaner';
import poll from '../helpers/pollServer';

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
    ], done);
  });

  describe('Signup page', function() {
    this.timeout(30000);

    const emailSelector = 'form input[name="email"]';
    const passwordSelector = 'form input[name="password"]';
    const submitSelector = 'form [type="submit"]';
    const eulaSelector = 'form [type="checkbox"]';
    const signupUrl = `${devServerBaseUrl}#/signup`;
    const goToSignup = (done) => {
      parallel([
        (next) => {
          browser
            .url(signupUrl)
            .waitForElementVisible('body', 5000);
          client.start(() => next(null));
        },
        cleanMongo
      ], done);
    };

    before(goToSignup);

    /*
     * Expect form and form inputs with name attributes.
     * These name attributes are required for autofill
     */
    it('should render the email field', (done) => {
      browser.expect.element(emailSelector).to.be.present;
      client.start(done);
    });

    it('should render the password field', (done) => {
      browser.expect.element(passwordSelector).to.be.present;
      client.start(done);
    });

    it('should render the terms of service checkbox', (done) => {
      browser.expect.element(eulaSelector).to.be.present;
      client.start(done);
    });

    /*
     * Expect unspecified tag with type attribute equal to "submit".
     * This type is required so that the enter key submits the form.
     */
    it('should render the submit button', (done) => {
      browser.expect.element(submitSelector).to.be.present;
      client.start(done);
    });

    context('Register a new user', () => {
      const defaultEmail = 'testy@example.com';
      const defaultPassword = 'badpassword';
      const signupWith = ({email = defaultEmail, password = defaultPassword}) => {
        return (done) => {
          goToSignup(() => {
            /*
             * Fill in email and password, and press the "enter" key.
             */
            browser
              .setValue(emailSelector, email)
              .click(eulaSelector)
              .setValue(passwordSelector, [password, browser.Keys.ENTER])
              .pause(500)
            ;
            done();
          });
        };
      };

      describe('successful registration', () => {
        // NOTE: must pass object literal cos ES6->ES5
        before(signupWith({}));

        it('should render the "success" message page', (done) => {
          browser.assert.containsText('body', 'Success');
          client.start(done);
        });

        it('should change the url', (done) => {
          browser.assert.urlContains('signup-success');
          client.start(done);
        });
      });

      describe('account for given email already exists', () => {
        const email = 'existing@example.com';
        before(signupWith({email}));

        it('should render an error message', (done) => {
          browser.assert.containsText('body', 'email is already registered');
          client.start(done);
        });

        it('should not change the url', (done) => {
          browser.assert.urlContains(signupUrl);
          client.start(done);
        });
      });

      describe('CORS misconfiguration', () => {
        const email = 'nocors@example.com';
        before(signupWith({email}));

        it('should not change the url', (done) => {
          browser.assert.urlContains(signupUrl);
          client.start(done);
        });

        it('should render an error message', (done) => {
          /*
           * There should be some client-side messaging to handle
           * unexpected server-side errors esp. CORS failure
           */
          // TODO: open an issue for this case and sync the copy
          browser.assert.containsText('body', 'Something went wrong');
          client.start(done);
        });
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
