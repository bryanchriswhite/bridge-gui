exports.renderElements = (elements) => {
  Object.keys(elements).forEach((elementName) => {
    const elementSelector = elements[elementName];

    it(`should render the ${elementName}`, (done) => {
      browser.expect.element(elementSelector).to.be.present;
      client.start(done);
    });
  });
};

exports.renderText = ({text, description}) => {
  it(`should render ${description}: ${text}`, (done) => {
    browser.assert.containsText('body', text);
    client.start(done);
  });
};

exports.notChangeTheUrl = () => {
  it('should not change the url', (done) => {
    browser.url((previousUrl) => {
      browser.assert.urlEquals(previousUrl);
      client.start(done);
    });
    client.start(done);
  });
};
