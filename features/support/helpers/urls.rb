module Helpers
  BASE_URL = "http://localhost:#{ENV['PORT'].to_i + 1}"

  URLS = {
      root: BASE_URL,
      'the signup page': "#{BASE_URL}/#/signup"
  }
end