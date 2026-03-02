// Hub C NLB builder: canonical source for trust/untrust NLB structure.
{
  _nlb_backend(zone, suffix, target_id):: {
    ['FW-%s-BACKEND-%s' % [std.asciiUpper(zone), suffix]]: {
      name: 'fw-%s-backend-%s' % [zone, std.asciiLower(suffix)],
      port: '0',
      is_backup: 'false',
      is_drain: 'false',
      is_offline: 'false',
      target_id: target_id,
      weight: '1',
    },
  },

  _nlb_backends(zone, ip1=null, ip2=null):: (
    if ip1 == null && ip2 == null then {}
    else self._nlb_backend(zone, '01', ip1) + self._nlb_backend(zone, '02', ip2)
  ),

  _nlb(zone, backends={}):: {
    ['NLB-FRA-LZ-HUB-%s-KEY' % std.asciiUpper(zone)]: {
      display_name: 'nlb-fra-hub-%s' % zone,
      enable_symmetric_hashing: true,
      is_preserve_source_destination: true,
      is_private: true,
      network_security_group_ids: ['NSG-FRA-LZ-HUB-%s-NLB-KEY' % std.asciiUpper(zone)],
      subnet_id: 'SN-FRA-LZ-HUB-%s-KEY' % std.asciiUpper(zone),
      listeners: {
        ['NLBLSNR-FRA-LZ-HUB-%s-KEY' % std.asciiUpper(zone)]: {
          name: 'listener-fra-%s' % zone,
          protocol: 'ANY',
          port: '0',
          backend_set: {
            name: 'backend-set-fra-%s' % zone,
            backends: backends,
            health_checker: {
              protocol: 'TCP',
              port: '22',
              interval_in_millis: '10000',
              retries: '3',
              timeout_in_millis: '3000',
            },
          },
        },
      },
    },
  },
}
