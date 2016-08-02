module Helpers
  module Signup
    def self.check_eula
      checkbox(name: :eula).set true
    end

    def self.email_field(name: :email)
      form_input(name: name, type: :email)
    end

    def self.password_field(name: :password)
      form_input(name: name, type: :password)
    end

    def self.text_field(name:)
      form_input(name: name, type: :text)
    end

    def self.checkbox(name:)
      form_input(name: name, type: :checkbox)
    end

    def self.submit_button
      criteria = { css: %q(form [type='submit']) }
      $browser.element(criteria)
    end

    def self.button(text:)
      criteria = { css: %q(button), text: text }
      $browser.element(criteria)
    end

    def self.form_input(name:, type:)
      criteria = { css: %Q(form input[type='#{type}'][name='#{name}']) }
      if TextFieldLocator::NON_TEXT_TYPES.include?(type.to_s)
        $browser.send(type, criteria)
      else
        $browser.text_field(criteria)
      end
    end

    # @@selector_map = {
    #     checkbox: lambda { %Q(form input[type='checkbox']) },
    #     field: lambda { |name:, type:| %Q(form input[type='#{type || name}'][name='#{name}']) },
    #     button: lambda { %Q(form [type='submit']) }
    # }
    #
    # def self.selector_matches(method_name, &block)
    #   @@selector_map.each do |selector_name, selector_value_lambda|
    #     match = /(\w+)_#{selector_name}$/.match(method_name)
    #     if match && match[1]
    #       if block
    #         selector = selector_value_lambda.call(match[1])
    #         block.call(selector)
    #       end
    #       return true
    #     else
    #       return false
    #     end
    #   end
    # end
    #
    # def self.respond_to?(method_name)
    #   selector_matches(method_name)
    # end
    #
    # # Element selection helpers
    # # i.e.:
    # #   `email_field`
    # #   `password_field`
    # #   `eula_checkbox`
    # def self.method_missing(method_name)
    #   puts 'hello from Signup.method_missing'
    #   selector_matches(method_name) do |selector|
    #     puts 'hello from before return'
    #     return @browser.element(css: selector) if selector
    #     puts 'hello from before super'
    #     super
    #   end
    # end
  end
end
