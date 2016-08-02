Given(/^the dev server is running$/) do
  $browser.goto(URLS[:root])
  Wait.until do
    if ERROR_TITLES.any? {|title| $browser.title =~ title}
      $browser.goto(URLS[:root])
      false
    else
      true
    end
  end

#   $browser.execute_script(<<JS
#     document.addEventListener("DOMContentLoaded", function(event) {
#       window.WATIR_RESUME = true;
#     });
# JS
#   )
#   Wait.until do
#     # $browser.element(css: 'body').present?
#     $browser.execute_script(<<JS
#       return window.WATIR_RESUME || false
# JS
#     )
#   end
end