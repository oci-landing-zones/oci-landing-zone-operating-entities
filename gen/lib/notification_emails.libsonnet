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
    local split_environment_topics =
      if std.objectHas(supported_emails, 'split_environment_topics') then
        assert std.type(supported_emails.split_environment_topics) == 'boolean' :
          '%s.split_environment_topics must be a boolean' % notification_label;
        supported_emails.split_environment_topics
      else false;
    local environment_map(key) =
      if std.objectHas(supported_emails, key) then
        validation.string_array_map(
          validation.object(supported_emails[key], '%s.%s' % [notification_label, key]),
          '%s.%s' % [notification_label, key],
          require_non_empty_arrays=true
        )
      else {};
    local project_emails = environment_map('projects_by_environment');
    local infra_emails = environment_map('environment_infra');
    local db_emails = environment_map('environment_db');
    local emails = validation.string_array_map(
      { [key]: supported_emails[key] for key in std.objectFields(supported_emails)
        if !std.member(['projects_by_environment', 'environment_infra', 'environment_db', 'split_environment_topics'], key) },
      notification_label,
      require_non_empty_arrays=true
    );
    {
      split_environment_topics: split_environment_topics,
      project_emails: project_emails,
      infra_emails: infra_emails,
      db_emails: db_emails,
      emails: {
        [key]: emails[key]
        for key in std.objectFields(emails)
      },
      topic_emails(key, environment=null)::
        if key == 'projects' && environment != null && std.objectHas(self.project_emails, environment) then
          self.project_emails[environment]
        else if key == 'environment_infra' && environment != null && std.objectHas(self.infra_emails, environment) then
          self.infra_emails[environment]
        else if key == 'environment_db' && environment != null && std.objectHas(self.db_emails, environment) then
          self.db_emails[environment]
        else if key == 'environment_infra' && std.objectHas(self.emails, 'infra_workloads') then self.emails.infra_workloads
        else if key == 'environment_db' && std.objectHas(self.emails, 'db_workloads') then self.emails.db_workloads
        else if std.objectHas(self.emails, key) then self.emails[key]
        else self.emails.default,
    },
}
