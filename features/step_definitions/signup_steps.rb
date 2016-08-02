When(/^I go to (.*)$/) do |location|
  url = URLS[location.to_sym]
  $browser.goto url
  @last_url = url
end

# Then(/^I should see the (\w+) (\w+)$/) do |name, type|
#   # Use `Signup.method_missing` to metaprogramatically get element
#   element = Signup.send("#{name}_#{type}")
#
#   expect(element.present?).to be true
# end

Then(/^I should see the (\w+) field$/) do |name|
  case name.to_sym
    when :email
      element = Signup.email_field
    when :password
      element = Signup.password_field
    else
      element = Signup.text_field(name: name)
  end

  expect(element.present?).to be true
end

Then(/^I should see the (\w+) checkbox$/) do |name|
  element = Signup.checkbox(name: name)

  expect(element.present?).to be true
end

Then(/^I should see the (\w+) button$/) do |name|
  case name.to_sym
    when :submit
      element = Signup.submit_button
    else
      element = Signup.button(text: name)
  end

  expect(element.present?).to be true
end

Given(/^no user exists with email '(.*)'$/) do |email|
  # noop, database_cleaner runs in `Before`
end

When(/^I register a user with email '(.*)'$/) do |email|
  step 'I go to the signup page'
  Signup.email_field.set(email)
  Signup.password_field.set('badpassword')
  Signup.check_eula
end

Then(/^I should see a '(.*)' message page$/) do |message|
  pending

end

Then(/^I should (not)? ?see an error$/) do |should_not|
  # selector = ''
  # element = $browser.element(css: selector)
  #
  # expect(element.present?).to be should_not
  pending
end

Then(/^The url should (not)? ?change$/) do |should_not|
  expect($browser.url =~ /#{@last_url}/).to be should_not
end