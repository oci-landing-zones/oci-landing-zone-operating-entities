{
  validate(product, cfg, supported_keys)::
    assert std.objectHas(cfg, 'notification_emails') && cfg.notification_emails != null :
      '%s notification_emails is required' % product;
    assert std.type(cfg.notification_emails) == 'object' :
      '%s notification_emails must be an object' % product;
    assert std.objectHas(cfg.notification_emails, 'default') :
      '%s notification_emails.default is required' % product;
    assert std.type(cfg.notification_emails.default) == 'array' :
      '%s notification_emails.default must be an array' % product;
    assert std.length(cfg.notification_emails.default) > 0 :
      '%s notification_emails.default must contain at least one value' % product;
    assert std.all([
      std.member(supported_keys, key)
      for key in std.objectFields(cfg.notification_emails)
    ]) : '%s notification_emails contains unsupported keys: %s' % [
      product,
      std.join(', ', [
        key
        for key in std.objectFields(cfg.notification_emails)
        if !std.member(supported_keys, key)
      ]),
    ];
    local notification_email_keys = std.objectFields(cfg.notification_emails);
    local non_array_notification_keys = [
      key
      for key in notification_email_keys
      if std.type(cfg.notification_emails[key]) != 'array'
    ];
    assert std.length(non_array_notification_keys) == 0 :
      '%s notification_emails.%s must be an array' % [product, non_array_notification_keys[0]];
    local empty_notification_keys = [
      key
      for key in notification_email_keys
      if std.length(cfg.notification_emails[key]) == 0
    ];
    assert std.length(empty_notification_keys) == 0 :
      '%s notification_emails.%s must contain at least one value' % [product, empty_notification_keys[0]];
    local invalid_notification_value_keys = [
      key
      for key in notification_email_keys
      if std.length([
        value
        for value in cfg.notification_emails[key]
        if std.type(value) != 'string' || value == ''
      ]) > 0
    ];
    assert std.length(invalid_notification_value_keys) == 0 :
      '%s notification_emails.%s values must be non-empty strings' % [product, invalid_notification_value_keys[0]];
    {
      emails: {
        [key]: cfg.notification_emails[key]
        for key in notification_email_keys
      },
      topic_emails(key)::
        if std.objectHas(self.emails, key) then self.emails[key]
        else self.emails['default'],
    },
}
