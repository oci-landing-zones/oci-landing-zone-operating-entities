local validation = import 'validation.libsonnet';

{
  validate(product, cfg, supported_keys)::
    local notification_label = '%s notification_emails' % product;
    local raw_emails =
      validation.required_object(cfg, 'notification_emails', notification_label);
    local default_emails =
      validation.required(raw_emails, 'default', '%s.default' % notification_label);
    local supported_emails =
      validation.allowed_keys(
        raw_emails { default: default_emails },
        notification_label,
        supported_keys
      );
    local emails = validation.string_array_map(
      supported_emails,
      notification_label,
      require_non_empty_arrays=true
    );
    {
      emails: {
        [key]: emails[key]
        for key in std.objectFields(emails)
      },
      topic_emails(key)::
        if std.objectHas(self.emails, key) then self.emails[key]
        else self.emails.default,
    },
}
