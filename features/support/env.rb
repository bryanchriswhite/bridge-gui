require 'rspec/expectations'
require 'watir-webdriver'
require 'mongoid'
require 'database_cleaner'

# Load files in ./helpers recursively
Dir["#{__dir__}/helpers/*{,*/*}.rb"].each {|file| load file}

include RSpec::Expectations
include Helpers

Mongoid.load!("#{__dir__}/mongoid.yml", :test)
DatabaseCleaner[:mongoid].strategy = :truncation

Before do
  $browser = Watir::Browser.new
  DatabaseCleaner.clean
end

After do
  $browser.close
end
