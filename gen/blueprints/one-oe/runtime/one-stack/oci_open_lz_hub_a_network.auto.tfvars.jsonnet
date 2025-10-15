local hub_a = import '../../../../addons/oci-hub-models/hub_a/oci_open_lz_hub_a_network.auto.tfvars.jsonnet';
local vcn_environments = import 'vcn_environments.libsonnet';
local vcn_environments_hub_a = import 'vcn_environments_hub_a.libsonnet';

hub_a + vcn_environments_hub_a
