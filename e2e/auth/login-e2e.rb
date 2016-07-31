require 'watir-webdriver'
browser = Watir::Browser.new
browser.goto('http://localhost:6382/#signup')

# browser.text_field(:id => 'entry_1000000').set 'your name'
# browser.select_list(:id => 'entry_1000001').select 'Ruby'
# browser.select_list(:id => 'entry_1000001').selected? 'Ruby'
# browser.button(:name => 'submit').click
# browser.text.include? 'Thank you'


