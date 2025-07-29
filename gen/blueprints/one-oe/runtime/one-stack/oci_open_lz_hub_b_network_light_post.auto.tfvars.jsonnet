local hub = import '../../../../addons/oci-hub-models/hub_b/oci_open_lz_hub_b_network_light_post.auto.tfvars.jsonnet';
local env_vcn = import 'net_env_vcn.libsonnet';
local env_vcn_hub = import 'net_env_vcn_hub_b_post.libsonnet';

hub + env_vcn + env_vcn_hub
