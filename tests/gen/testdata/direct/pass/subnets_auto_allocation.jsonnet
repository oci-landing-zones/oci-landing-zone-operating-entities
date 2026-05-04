// subnet allocation helper preserves existing mixed-size CIDR alignment
local subnets = import 'gen/lib/subnets.libsonnet';
{
  mixed_sizes: subnets.auto_subnets('10.0.80.0/21', [
    { name: 'int-lb', size: '/25' },
    { name: 'control-plane', size: '/25' },
    { name: 'workers', size: '/23' },
    { name: 'pods', size: '/23' },
  ]),
  default_24s: subnets.auto_subnets_24('10.0.0.0/21', ['lb', 'mgmt', 'mon', 'dns']),
}
