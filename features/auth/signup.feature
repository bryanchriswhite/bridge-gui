Feature: Signup

  Background: Ensure dev server is up
    Given the dev server is running

  Scenario: Rendering signup page

    When I go to the signup page
    Then I should see the email field
    And I should see the password field
    And I should see the eula checkbox
    And I should see the submit button

  Scenario: Registering with new email
    Given no user exists with email 'testerz@example.com'
    When I register a user with email 'testerz@example.com'
    Then I should see a 'signup success' message page
    And The url should change
    And I should not see an error

  Scenario: Registering with an existing email
    Given a user exists with email 'testerz@example.com'
    When I register a user with email 'testerz@example.com'
    Then I should see a 'signup success' message page
    And The url should not change
    And I should see an error
