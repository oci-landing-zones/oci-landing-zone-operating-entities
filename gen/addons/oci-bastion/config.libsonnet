// Normalize the optional persistent hub Bastion configuration.
local validation = import '../../lib/validation.libsonnet';
local cidrs = import '../../lib/cidrs.libsonnet';

{
  normalize(value)::
    if value == null then null else
      local label = 'config.bastion';
      local input = validation.allowed_keys(
        validation.object(value, label),
        label,
        ['client_cidr_block_allow_list', 'max_session_ttl_in_seconds']
      );
      local client_label = label + '.client_cidr_block_allow_list';
      local clients = validation.array(
        validation.required(input, 'client_cidr_block_allow_list', client_label),
        client_label,
        require_non_empty=true
      );
      assert std.length(clients) <= 20 : '%s must contain at most 20 values' % client_label;
      local parsed_clients = [
        cidrs.parse('%s[%d]' % [client_label, i], clients[i])
        for i in std.range(0, std.length(clients) - 1)
      ];
      assert std.all([entry.prefix > 0 for entry in parsed_clients]) :
             '%s must not include 0.0.0.0/0' % client_label;
      local ttl =
        if std.objectHas(input, 'max_session_ttl_in_seconds') && input.max_session_ttl_in_seconds != null then
          input.max_session_ttl_in_seconds
        else 3600;
      assert std.type(ttl) == 'number' && ttl == std.floor(ttl) && ttl >= 1800 && ttl <= 10800 :
             '%s.max_session_ttl_in_seconds must be an integer between 1800 and 10800' % label;
      {
        client_cidr_block_allow_list: [entry.cidr for entry in parsed_clients],
        max_session_ttl_in_seconds: ttl,
      },
}
