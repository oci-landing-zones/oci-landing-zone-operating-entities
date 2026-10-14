// Environment platform network scopes use compact tokens in Network Firewall address-list names.
// contains: "nfw-fra-lz-al-pp-pf-exacs"
local scopes = import 'gen/lib/network_scope_names.libsonnet';

local name = 'nfw-fra-lz-al-' + scopes.compact('preprod-platform-exacs');

assert name == 'nfw-fra-lz-al-pp-pf-exacs' :
  'environment platform Network Firewall address-list name must use the compact platform token';
{
  address_list_name: name,
}
