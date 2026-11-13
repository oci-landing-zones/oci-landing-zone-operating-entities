local cost_scope = import '../../lib/cost_scope.libsonnet';

function(bastion, n, group_names, key_segments=[], ownership=cost_scope.shared)
  if bastion == null || std.length(group_names) == 0 then {} else
    local groups = std.join(', ', ["'id_lz_common'/'%s'" % name for name in std.set(group_names)]);
    local allow = 'allow group %s' % groups;
    local security = n.compartment_path(['security']);
    local network = n.compartment_path(['network']);
    {
      [n.key_global('PCY', key_segments + ['BASTION', 'ACCESS'])]: {
        _cost_scope:: ownership,
        name: n.display_global('pcy', key_segments + ['bastion', 'access']),
        description: 'Grants existing administrators access to shared Bastion sessions.',
        compartment_id: 'CMP-LANDINGZONE-KEY',
        statements: [
          '%s to use bastion in compartment %s' % [allow, security],
          '%s to manage bastion-session in compartment %s' % [allow, security],
          '%s to inspect work-requests in compartment %s' % [allow, security],
        ] + [
          '%s to read %s in compartment %s' % [allow, resource, network]
          for resource in ['vcns', 'subnets', 'vnics', 'vnic-attachments']
        ],
      },
    }
