local common = import '../../../../../gen/hub/hub_common.libsonnet';
{
  host10: common.host_ip_from_subnet('10.0.64.128/25', 10),
  host20: common.host_ip_from_subnet('10.0.64.128/25', 20),
  narrow_host20: common.host_ip_from_subnet('10.0.64.128/28', 20),
  bastion: common.bastion_ip_from_mgmt('10.0.64.128/25'),
  nfw: common.nfw_ip_from_subnet('10.0.64.128/25'),
  narrow_bastion: common.bastion_ip_from_mgmt('10.0.64.128/28'),
  narrow_nfw: common.nfw_ip_from_subnet('10.0.64.128/28'),
}
