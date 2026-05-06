// gen/labels.libsonnet
// Shared human-readable label helpers for generated descriptions.

{
  title_case(name):: std.asciiUpper(name[0:1]) + name[1:],

  project_display(project_name)::
    local s = std.asciiLower(project_name);
    if std.startsWith(s, 'proj') then
      'Project ' + s[4:]
    else
      self.title_case(project_name),

  project_desc_lower(project_name)::
    local s = std.asciiLower(project_name);
    if std.startsWith(s, 'proj') then
      'project ' + s[4:]
    else
      project_name,
}
