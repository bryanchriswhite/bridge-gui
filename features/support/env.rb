# Configure the load path so all dependencies in the Gemfile can be required
require 'rubygems'
require 'bundler/setup'

require 'rspec/expectations'
require 'watir-webdriver'
require 'mongoid'
require 'database_cleaner'

# Load files in ./helpers recursively
Dir["#{__dir__}/helpers/*{,*/*}.rb"].each {|file| load file}

include RSpec::Expectations
include Watir
include Helpers

# TODO: reference `ENV['DATABASE_URL']` instead
Mongoid.load!("#{__dir__}/mongoid.yml", :test)
DatabaseCleaner[:mongoid].strategy = :truncation

Before do
  $browser = Browser.new
  DatabaseCleaner.clean
end

After do
  $browser.close
end
