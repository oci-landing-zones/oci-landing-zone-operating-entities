local hub_a_light = import '../../../../addons/oci-hub-models/hub_a/oci_open_lz_hub_a_network_light.auto.tfvars.jsonnet';
local vcn_environments_hub_a = import 'vcn_environments_hub_a.libsonnet';

hub_a_light + vcn_environments_hub_a
